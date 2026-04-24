/**
 * 文件上传 API - 上传文件到 R2 对象存储
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { uploadFile, generateR2Key } from "@/lib/r2";
import { NextRequest, NextResponse } from "next/server";


/** POST /api/upload - 上传文件 */
export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext();

    if (!env.R2) {
      return NextResponse.json(
        { success: false, error: "R2 存储未配置" },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const conversationId = formData.get("conversation_id") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "未提供文件" },
        { status: 400 }
      );
    }

    // 限制文件大小（50MB）
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: "文件大小超过50MB限制" },
        { status: 413 }
      );
    }

    // 生成 R2 存储路径
    const prefix = conversationId ? `chat/${conversationId}` : "uploads";
    const r2Key = generateR2Key(prefix, file.name);

    // 上传到 R2
    const arrayBuffer = await file.arrayBuffer();
    await uploadFile(env.R2, r2Key, arrayBuffer, {
      contentType: file.type,
      fileName: file.name,
    });

    return NextResponse.json({
      success: true,
      data: {
        r2_key: r2Key,
        file_name: file.name,
        file_size: file.size,
        file_mime: file.type,
        url: `/api/files/${r2Key}`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
