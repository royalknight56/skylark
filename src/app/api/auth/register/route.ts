/**
 * 注册 API - 创建新用户并设置 cookie
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { generateUserId, ensureUser, AUTH_COOKIE } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/** POST /api/auth/register - 注册新用户 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { name: string; email: string };

    if (!body.name?.trim() || !body.email?.trim()) {
      return NextResponse.json({ success: false, error: "姓名和邮箱不能为空" }, { status: 400 });
    }

    const userId = generateUserId(body.email.trim());
    const { env } = await getCloudflareContext();

    const user = await ensureUser(env.DB, {
      id: userId,
      email: body.email.trim(),
      name: body.name.trim(),
      avatar_url: null,
      status: "online",
      current_org_id: null,
      created_at: new Date().toISOString(),
    });

    const res = NextResponse.json({ success: true, data: user }, { status: 201 });

    res.cookies.set(AUTH_COOKIE, user.id, {
      httpOnly: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 天
      sameSite: "lax",
    });

    return res;
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
