/**
 * 当前用户 API - 获取登录状态
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getRequestUser } from "@/lib/auth";
import { NextResponse } from "next/server";


/** GET /api/auth/me - 获取当前登录用户 */
export async function GET() {
  try {
    const { env } = await getCloudflareContext();
    const user = await getRequestUser(env.DB);

    if (!user) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
