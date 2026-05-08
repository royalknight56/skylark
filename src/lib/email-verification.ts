/**
 * Email verification helpers.
 */

import type { User } from "./types";

const VERIFICATION_TOKEN_BYTES = 32;
const VERIFICATION_TOKEN_TTL_MS = 30 * 60 * 1000;

type AuthEmailEnv = CloudflareEnv & {
  AUTH_EMAIL_FROM?: string;
};

interface EmailVerificationRow {
  id: string;
  user_id: string;
  email: string;
}

export interface EmailVerificationResult {
  success: boolean;
  user?: User;
  error?: "invalid" | "expired" | "used";
}

export async function sendEmailVerification(
  env: AuthEmailEnv,
  user: Pick<User, "id" | "email" | "name">,
  origin: string
): Promise<void> {
  const fromEmail = env.AUTH_EMAIL_FROM?.trim();
  if (!fromEmail) {
    throw new Error("AUTH_EMAIL_FROM 未配置，无法发送验证邮件");
  }

  const token = createVerificationToken();
  const tokenHash = await hashVerificationToken(token);
  const expiresAt = toD1DateTime(new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS));
  const verifyUrl = new URL("/verify-email", origin);
  verifyUrl.searchParams.set("token", token);

  await env.DB
    .prepare("UPDATE email_verifications SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL")
    .bind(user.id)
    .run();

  await env.DB
    .prepare(`
      INSERT INTO email_verifications (id, user_id, email, token_hash, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    .bind(`emailv-${crypto.randomUUID()}`, user.id, user.email, tokenHash, expiresAt)
    .run();

  const appName = "Skylark";
  const safeName = escapeHtml(user.name);
  const link = verifyUrl.toString();

  await env.EMAIL.send({
    from: { email: fromEmail, name: appName },
    to: user.email,
    subject: `验证你的 ${appName} 账号邮箱`,
    text: [
      `${user.name}，你好：`,
      "",
      `请在 30 分钟内打开下面的链接完成邮箱验证：`,
      link,
      "",
      "如果这不是你本人操作，可以忽略这封邮件。",
    ].join("\n"),
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.7;color:#111827;">
        <p>${safeName}，你好：</p>
        <p>请在 30 分钟内点击下面的按钮完成邮箱验证。</p>
        <p>
          <a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#2563eb;color:#ffffff;text-decoration:none;">
            验证邮箱
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px;">如果按钮无法打开，请复制此链接到浏览器：<br>${escapeHtml(link)}</p>
        <p style="color:#6b7280;font-size:13px;">如果这不是你本人操作，可以忽略这封邮件。</p>
      </div>
    `,
  });
}

export async function verifyEmailToken(
  db: D1Database,
  token: string
): Promise<EmailVerificationResult> {
  if (!token.trim()) {
    return { success: false, error: "invalid" };
  }

  const tokenHash = await hashVerificationToken(token);
  const now = toD1DateTime(new Date());
  const record = await db
    .prepare(`
      SELECT id, user_id, email
      FROM email_verifications
      WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?
      LIMIT 1
    `)
    .bind(tokenHash, now)
    .first<EmailVerificationRow>();

  if (!record) {
    const usedOrExpired = await db
      .prepare("SELECT used_at, expires_at FROM email_verifications WHERE token_hash = ? LIMIT 1")
      .bind(tokenHash)
      .first<{ used_at: string | null; expires_at: string }>();
    if (usedOrExpired?.used_at) return { success: false, error: "used" };
    if (usedOrExpired?.expires_at && usedOrExpired.expires_at <= now) {
      return { success: false, error: "expired" };
    }
    return { success: false, error: "invalid" };
  }

  await db.batch([
    db.prepare("UPDATE email_verifications SET used_at = CURRENT_TIMESTAMP WHERE id = ?").bind(record.id),
    db.prepare("UPDATE users SET email_verified_at = CURRENT_TIMESTAMP, status = 'online' WHERE id = ?").bind(record.user_id),
  ]);

  const user = await db
    .prepare(`
      SELECT id, email, name, avatar_url, login_phone, status, status_text,
        status_emoji, signature, current_org_id, created_at
      FROM users
      WHERE id = ?
    `)
    .bind(record.user_id)
    .first<User>();

  if (!user) {
    return { success: false, error: "invalid" };
  }

  return { success: true, user };
}

function createVerificationToken(): string {
  const bytes = new Uint8Array(VERIFICATION_TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

async function hashVerificationToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

function toD1DateTime(date: Date): string {
  return date.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
