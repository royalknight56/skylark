/**
 * 企业成员 API
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getOrgMembers } from "@/lib/db/queries";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/** GET /api/orgs/[id]/members - 获取企业成员列表 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { env } = await getCloudflareContext();
    const members = await getOrgMembers(env.DB, id);
    return NextResponse.json({ success: true, data: members });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
