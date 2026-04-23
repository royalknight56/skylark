/**
 * 切换企业 API
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { switchOrganization, isOrgMember } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/** POST /api/orgs/switch */
export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as { org_id: string };

    const { env } = await getCloudflareContext();
    const isMember = await isOrgMember(env.DB, body.org_id, userId);
    if (!isMember) {
      return NextResponse.json({ success: false, error: "你不是该企业的成员" }, { status: 403 });
    }

    await switchOrganization(env.DB, userId, body.org_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
