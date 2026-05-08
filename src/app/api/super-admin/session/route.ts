/**
 * 超级管理后台会话 API
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  clearSuperAdminCookie,
  createSuperAdminSession,
  isSuperAdminConfigured,
  setSuperAdminCookie,
  verifySuperAdminOwner,
  verifySuperAdminPassword,
  verifySuperAdminPath,
  verifySuperAdminSession,
} from "@/lib/super-admin";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/super-admin/session */
export async function GET(request: NextRequest) {
  const { env } = await getCloudflareContext();
  if (!isSuperAdminConfigured(env)) {
    return NextResponse.json({ success: false, configured: false, error: "超级管理后台未配置" }, { status: 503 });
  }
  const authenticated = await verifySuperAdminSession(request, env);
  return NextResponse.json({ success: true, configured: true, authenticated });
}

/** POST /api/super-admin/session */
export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext();
    if (!isSuperAdminConfigured(env)) {
      return NextResponse.json({ success: false, error: "超级管理后台未配置" }, { status: 503 });
    }

    const body = (await request.json()) as { path_key?: string; password?: string };
    const validPath = await verifySuperAdminPath(env, body.path_key || "");
    const validPassword = await verifySuperAdminPassword(env, body.password || "");
    const validOwner = await verifySuperAdminOwner(request, env);
    if (!validPath || !validPassword || !validOwner) {
      return NextResponse.json({ success: false, error: "访问密钥或口令错误" }, { status: 403 });
    }

    const token = await createSuperAdminSession(env);
    const response = NextResponse.json({ success: true });
    setSuperAdminCookie(response, token);
    return response;
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** DELETE /api/super-admin/session */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  clearSuperAdminCookie(response);
  return response;
}
