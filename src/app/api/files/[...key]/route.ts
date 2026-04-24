/**
 * 文件下载 API - 从 R2 获取文件
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getFile } from "@/lib/r2";
import { NextRequest, NextResponse } from "next/server";


/** GET /api/files/[...key] - 获取文件 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await params;
    const r2Key = key.join("/");
    const { env } = await getCloudflareContext();

    if (!env.R2) {
      return new NextResponse("R2 存储未配置", { status: 503 });
    }

    const object = await getFile(env.R2, r2Key);
    if (!object) {
      return new NextResponse("文件不存在", { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    const fileName = object.customMetadata?.fileName;
    if (fileName) {
      headers.set("Content-Disposition", `inline; filename="${encodeURIComponent(fileName)}"`);
    }

    return new NextResponse(object.body, { headers });
  } catch (error) {
    return new NextResponse(String(error), { status: 500 });
  }
}
