/**
 * 产品反馈 API
 * @author skylark
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getRequestUserId } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

type FeedbackType = "bug" | "suggestion" | "experience" | "other";

interface FeedbackBody {
  org_id?: string | null;
  type?: FeedbackType;
  title?: string;
  content?: string;
  contact?: string;
  page_url?: string;
  user_agent?: string;
}

const feedbackTypes = new Set<FeedbackType>(["bug", "suggestion", "experience", "other"]);

function trimToLength(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

/** POST /api/feedback */
export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });

    const body = (await request.json()) as FeedbackBody;
    const title = trimToLength(body.title, 120);
    const content = trimToLength(body.content, 3000);
    const type = body.type && feedbackTypes.has(body.type) ? body.type : "bug";
    const orgId = trimToLength(body.org_id, 80) || null;
    const contact = trimToLength(body.contact, 200) || null;
    const pageUrl = trimToLength(body.page_url, 500) || null;
    const userAgent = trimToLength(body.user_agent || request.headers.get("user-agent"), 500) || null;

    if (!title) return NextResponse.json({ success: false, error: "请填写问题标题" }, { status: 400 });
    if (!content) return NextResponse.json({ success: false, error: "请填写问题描述" }, { status: 400 });

    const { env } = await getCloudflareContext();

    if (orgId) {
      const member = await env.DB
        .prepare("SELECT 1 FROM org_members WHERE org_id = ? AND user_id = ? LIMIT 1")
        .bind(orgId, userId)
        .first();
      if (!member) {
        return NextResponse.json({ success: false, error: "无权为该企业提交反馈" }, { status: 403 });
      }
    }

    const id = `feedback-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
    await env.DB
      .prepare(`
        INSERT INTO product_feedback (
          id, org_id, user_id, type, title, content, contact, page_url, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(id, orgId, userId, type, title, content, contact, pageUrl, userAgent)
      .run();

    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
