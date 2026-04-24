/**
 * 当前用户 API
 * GET: 获取个人信息
 * PUT: 更新个人信息（名字、头像、签名、状态）
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import type { User } from "@/lib/types";

/** GET /api/users/me */
export async function GET() {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { env } = await getCloudflareContext();
    const user = await env.DB
      .prepare("SELECT * FROM users WHERE id = ?")
      .bind(userId)
      .first<User>();

    if (!user) return NextResponse.json({ success: false, error: "用户不存在" }, { status: 404 });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** PUT /api/users/me — 更新个人信息 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { env } = await getCloudflareContext();
    const body = (await request.json()) as {
      name?: string;
      avatar_url?: string;
      signature?: string | null;
      status?: string;
      status_text?: string | null;
      status_emoji?: string | null;
    };

    const setClauses: string[] = [];
    const values: (string | null)[] = [];

    if (body.name !== undefined) { setClauses.push("name = ?"); values.push(body.name); }
    if (body.avatar_url !== undefined) { setClauses.push("avatar_url = ?"); values.push(body.avatar_url); }
    if (body.signature !== undefined) { setClauses.push("signature = ?"); values.push(body.signature); }
    if (body.status !== undefined) { setClauses.push("status = ?"); values.push(body.status); }
    if (body.status_text !== undefined) { setClauses.push("status_text = ?"); values.push(body.status_text); }
    if (body.status_emoji !== undefined) { setClauses.push("status_emoji = ?"); values.push(body.status_emoji); }

    if (setClauses.length === 0) {
      return NextResponse.json({ success: false, error: "无更新内容" }, { status: 400 });
    }

    values.push(userId);
    await env.DB
      .prepare(`UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`)
      .bind(...values)
      .run();

    const updated = await env.DB
      .prepare("SELECT * FROM users WHERE id = ?")
      .bind(userId)
      .first<User>();

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
