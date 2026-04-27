/**
 * 登出 API - 清除 cookie
 * @author skylark
 */

import { AUTH_COOKIE } from "@/lib/auth";
import { NextResponse } from "next/server";


/** POST /api/auth/logout - 登出 */
export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
