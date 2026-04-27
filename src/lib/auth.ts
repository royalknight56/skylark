/**
 * 认证工具
 * 生产环境：Cloudflare Access JWT → 用户身份
 * 开发环境：cookie skylark-uid → 数据库查用户
 * @author skylark
 */

import type { NextResponse } from 'next/server';
import type { User, OrgMemberRole, AdminPermission } from './types';
import { getUserAdminPermissions } from './db/queries';
import { cookies } from 'next/headers';

/** cookie 名 */
export const AUTH_COOKIE = 'skylark-uid';
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const PASSWORD_HASH_ALGORITHM = 'pbkdf2-sha256';
const PASSWORD_HASH_ITERATIONS = 100_000;

const USER_SELECT = `
  id, email, name, avatar_url, login_phone, status, status_text,
  status_emoji, signature, current_org_id, created_at
`;

interface UserWithPassword extends User {
  password_hash: string | null;
}

/**
 * 获取当前请求对应的用户 ID
 * 优先级：CF Access header > cookie
 */
export async function getRequestUserId(): Promise<string | null> {
  const jar = await cookies();
  const uid = jar.get(AUTH_COOKIE)?.value;
  return uid || null;
}

/**
 * 获取当前请求的完整用户信息（从数据库）
 * 如果未登录返回 null
 */
export async function getRequestUser(db: D1Database): Promise<User | null> {
  const userId = await getRequestUserId();
  if (!userId) return null;

  return db
    .prepare(`SELECT ${USER_SELECT} FROM users WHERE id = ?`)
    .bind(userId)
    .first<User>();
}

/** 标准化邮箱，避免大小写导致重复账号 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** 校验邮箱格式 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** 校验密码强度 */
export function isValidPassword(password: string): boolean {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

/** 设置登录 Cookie */
export function setAuthCookie(response: NextResponse, userId: string): void {
  response.cookies.set(AUTH_COOKIE, userId, {
    httpOnly: true,
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

/** 根据邮箱获取完整认证用户 */
export async function getUserByEmail(db: D1Database, email: string): Promise<UserWithPassword | null> {
  await ensureAuthSchema(db);
  return db
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(normalizeEmail(email))
    .first<UserWithPassword>();
}

/** 根据用户 ID 获取可返回给前端的用户信息 */
export async function getPublicUserById(db: D1Database, userId: string): Promise<User | null> {
  return db
    .prepare(`SELECT ${USER_SELECT} FROM users WHERE id = ?`)
    .bind(userId)
    .first<User>();
}

/** 根据邮箱生成确定性用户 ID */
export function generateUserId(email: string): string {
  let hash = 0;
  const normalizedEmail = normalizeEmail(email);
  for (let i = 0; i < normalizedEmail.length; i++) {
    const char = normalizedEmail.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `user-${Math.abs(hash).toString(36)}`;
}

/** 创建密码账号 */
export async function createPasswordUser(
  db: D1Database,
  user: Pick<User, 'id' | 'email' | 'name' | 'avatar_url'>,
  passwordHash: string
): Promise<User> {
  await ensureAuthSchema(db);
  await db
    .prepare(`
      INSERT INTO users (id, email, password_hash, name, avatar_url, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .bind(user.id, normalizeEmail(user.email), passwordHash, user.name, user.avatar_url, 'online')
    .run();

  const createdUser = await getPublicUserById(db, user.id);
  if (!createdUser) {
    throw new Error('用户创建失败');
  }
  return createdUser;
}

/** 确保认证相关字段存在，避免旧本地 D1 未执行迁移时注册失败 */
async function ensureAuthSchema(db: D1Database): Promise<void> {
  const columns = await db.prepare('PRAGMA table_info(users)').all<{ name: string }>();
  const hasPasswordHash = columns.results.some((column) => column.name === 'password_hash');
  if (!hasPasswordHash) {
    await db.prepare('ALTER TABLE users ADD COLUMN password_hash TEXT').run();
  }
}

/** 生成密码哈希 */
export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const hash = await derivePasswordHash(password, salt, PASSWORD_HASH_ITERATIONS);
  return [
    PASSWORD_HASH_ALGORITHM,
    String(PASSWORD_HASH_ITERATIONS),
    bytesToBase64(salt),
    bytesToBase64(hash),
  ].join(':');
}

/** 校验密码 */
export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  const [algorithm, iterationsText, saltText, hashText] = passwordHash.split(':');
  if (algorithm !== PASSWORD_HASH_ALGORITHM || !iterationsText || !saltText || !hashText) {
    return false;
  }

  const iterations = Number(iterationsText);
  if (!Number.isInteger(iterations) || iterations <= 0) {
    return false;
  }

  const salt = base64ToBytes(saltText);
  const expectedHash = base64ToBytes(hashText);
  const actualHash = await derivePasswordHash(password, salt, iterations);
  return constantTimeEqual(actualHash, expectedHash);
}

/** PBKDF2 派生密码哈希 */
async function derivePasswordHash(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: toArrayBuffer(salt), iterations },
    key,
    256
  );
  return new Uint8Array(bits);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

/**
 * 获取用户在某企业中的角色
 * 未加入返回 null
 */
export async function getOrgRole(
  db: D1Database,
  orgId: string,
  userId: string
): Promise<OrgMemberRole | null> {
  const row = await db
    .prepare('SELECT role FROM org_members WHERE org_id = ? AND user_id = ?')
    .bind(orgId, userId)
    .first<{ role: OrgMemberRole }>();
  return row?.role ?? null;
}

/**
 * 校验 owner 权限，非 owner 返回 null
 */
export async function requireOwner(
  db: D1Database,
  orgId: string,
  userId: string
): Promise<OrgMemberRole | null> {
  const role = await getOrgRole(db, orgId, userId);
  if (role !== 'owner') return null;
  return role;
}

/**
 * 校验管理后台权限：owner 拥有全部权限；admin 按角色检查具体权限点
 * 通过则返回用户角色，否则返回 null
 */
export async function requireAdmin(
  db: D1Database,
  orgId: string,
  userId: string,
  permission?: AdminPermission
): Promise<OrgMemberRole | null> {
  const role = await getOrgRole(db, orgId, userId);
  if (!role) return null;
  // owner 拥有全部权限
  if (role === 'owner') return role;
  // admin 需检查角色权限
  if (role === 'admin') {
    if (!permission) return role;
    const perms = await getUserAdminPermissions(db, orgId, userId);
    return perms.includes(permission) ? role : null;
  }
  return null;
}

