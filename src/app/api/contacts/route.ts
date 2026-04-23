/**
 * 通讯录 API - 联系人管理（企业隔离）
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getContacts, addContact, removeContact } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/** GET /api/contacts?org_id=xxx */
export async function GET(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get("org_id");
    if (!orgId) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    const { env } = await getCloudflareContext();
    const contacts = await getContacts(env.DB, orgId, userId);
    return NextResponse.json({ success: true, data: contacts });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** POST /api/contacts */
export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { env } = await getCloudflareContext();
    const body = (await request.json()) as { org_id: string; contact_id: string; group_name?: string };

    if (!body.org_id) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    await addContact(env.DB, body.org_id, userId, body.contact_id, body.group_name);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** DELETE /api/contacts */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const { env } = await getCloudflareContext();
    const { org_id, contact_id } = (await request.json()) as { org_id: string; contact_id: string };

    if (!org_id) return NextResponse.json({ success: false, error: "缺少 org_id" }, { status: 400 });

    await removeContact(env.DB, org_id, userId, contact_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
