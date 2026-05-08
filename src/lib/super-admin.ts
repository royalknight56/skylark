/**
 * 超级管理后台认证工具
 * @author skylark
 */

import type { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";

export const SUPER_ADMIN_COOKIE = "skylark-super-admin";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

interface SuperAdminEnv {
  SUPER_ADMIN_PATH_HASH?: string;
  SUPER_ADMIN_PASSWORD_HASH?: string;
  SUPER_ADMIN_OWNER_EMAIL_HASH?: string;
  SUPER_ADMIN_SESSION_SECRET?: string;
}

function getSuperAdminEnv(env: CloudflareEnv): SuperAdminEnv {
  return env as CloudflareEnv & SuperAdminEnv;
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index++) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

export async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  return bytesToHex(await crypto.subtle.digest("SHA-256", data));
}

async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToHex(signature);
}

export function isSuperAdminConfigured(env: CloudflareEnv): boolean {
  const config = getSuperAdminEnv(env);
  return Boolean(
    config.SUPER_ADMIN_PATH_HASH &&
    config.SUPER_ADMIN_PASSWORD_HASH &&
    config.SUPER_ADMIN_OWNER_EMAIL_HASH &&
    config.SUPER_ADMIN_SESSION_SECRET
  );
}

export async function verifySuperAdminPath(env: CloudflareEnv, pathKey: string): Promise<boolean> {
  const expected = getSuperAdminEnv(env).SUPER_ADMIN_PATH_HASH;
  if (!expected || !pathKey) return false;
  return constantTimeEqual(await sha256Hex(pathKey), expected);
}

export async function verifySuperAdminPassword(env: CloudflareEnv, password: string): Promise<boolean> {
  const expected = getSuperAdminEnv(env).SUPER_ADMIN_PASSWORD_HASH;
  if (!expected || !password) return false;
  return constantTimeEqual(await sha256Hex(password), expected);
}

export async function verifySuperAdminOwner(request: NextRequest, env: CloudflareEnv): Promise<boolean> {
  const expected = getSuperAdminEnv(env).SUPER_ADMIN_OWNER_EMAIL_HASH;
  const userId = request.cookies.get(AUTH_COOKIE)?.value;
  if (!expected || !userId) return false;

  const user = await env.DB
    .prepare("SELECT email FROM users WHERE id = ?")
    .bind(userId)
    .first<{ email: string }>();
  if (!user?.email) return false;

  return constantTimeEqual(await sha256Hex(user.email.trim().toLowerCase()), expected);
}

export async function createSuperAdminSession(env: CloudflareEnv): Promise<string> {
  const secret = getSuperAdminEnv(env).SUPER_ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("超级管理后台未配置会话密钥");
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `super-admin.${expiresAt}`;
  const signature = await hmacHex(secret, payload);
  return `${payload}.${signature}`;
}

export async function verifySuperAdminSession(request: NextRequest, env: CloudflareEnv): Promise<boolean> {
  const secret = getSuperAdminEnv(env).SUPER_ADMIN_SESSION_SECRET;
  const token = request.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!secret || !token) return false;

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "super-admin") return false;

  const expiresAt = Number(parts[1]);
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;

  const payload = `${parts[0]}.${parts[1]}`;
  const expectedSignature = await hmacHex(secret, payload);
  return constantTimeEqual(parts[2], expectedSignature);
}

export function setSuperAdminCookie(response: NextResponse, token: string): void {
  response.cookies.set(SUPER_ADMIN_COOKIE, token, {
    httpOnly: true,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearSuperAdminCookie(response: NextResponse): void {
  response.cookies.set(SUPER_ADMIN_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
}
