/**
 * 企业 API - 获取用户的企业列表 / 创建新企业
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserOrganizations, createOrganization } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/** GET /api/orgs */
export async function GET() {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { env } = await getCloudflareContext();
    const orgs = await getUserOrganizations(env.DB, userId);
    return NextResponse.json({ success: true, data: orgs });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** POST /api/orgs */
export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { env } = await getCloudflareContext();
    const body = (await request.json()) as { name: string; description?: string };

    const id = `org-${Date.now().toString(36)}`;
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const org = await createOrganization(env.DB, {
      id, name: body.name, description: body.description,
      owner_id: userId, invite_code: inviteCode,
    });

    return NextResponse.json({ success: true, data: org }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
