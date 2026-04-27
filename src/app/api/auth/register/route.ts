/**
 * 注册 API - 创建密码账号并设置登录 Cookie
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  createPasswordUser,
  generateUserId,
  getUserByEmail,
  hashPassword,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
  setAuthCookie,
} from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

interface RegisterRequestBody {
  name?: string;
  email?: string;
  password?: string;
}

/** POST /api/auth/register - 注册新用户 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegisterRequestBody;
    const name = body.name?.trim() ?? "";
    const email = normalizeEmail(body.email ?? "");
    const password = body.password ?? "";

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, error: "姓名、邮箱和密码不能为空" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, error: "邮箱格式不正确" }, { status: 400 });
    }
    if (!isValidPassword(password)) {
      return NextResponse.json(
        { success: false, error: "密码至少 8 位，且必须包含字母和数字" },
        { status: 400 }
      );
    }

    const { env } = await getCloudflareContext();
    const existing = await getUserByEmail(env.DB, email);
    if (existing) {
      return NextResponse.json({ success: false, error: "该邮箱已注册，请直接登录" }, { status: 409 });
    }

    const user = await createPasswordUser(env.DB, {
      id: generateUserId(email),
      email,
      name,
      avatar_url: null,
    }, await hashPassword(password));

    const res = NextResponse.json({ success: true, data: user }, { status: 201 });
    setAuthCookie(res, user.id);
    return res;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
