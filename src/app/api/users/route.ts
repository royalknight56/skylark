/**
 * 用户 API - 获取所有用户
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAllUsers } from "@/lib/db/queries";
import { NextResponse } from "next/server";

export const runtime = "edge";

/** GET /api/users - 获取用户列表 */
export async function GET() {
  try {
    const { env } = await getCloudflareContext();
    const users = await getAllUsers(env.DB);
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
