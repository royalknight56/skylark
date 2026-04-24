/**
 * 认证工具
 * 生产环境：Cloudflare Access JWT → 用户身份
 * 开发环境：cookie skylark-uid → 数据库查用户
 * @author skylark
 */

import type { User, OrgMemberRole, AdminPermission } from './types';
import { getUserAdminPermissions } from './db/queries';
import { cookies } from 'next/headers';

/** cookie 名 */
export const AUTH_COOKIE = 'skylark-uid';

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
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first<User>();
}

/** 根据邮箱生成确定性用户 ID */
export function generateUserId(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `user-${Math.abs(hash).toString(36)}`;
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

/** 确保用户存在于数据库中（upsert） */
export async function ensureUser(db: D1Database, user: User): Promise<User> {
  const existing = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(user.id)
    .first<User>();

  if (existing) {
    await db
      .prepare('UPDATE users SET status = ? WHERE id = ?')
      .bind('online', existing.id)
      .run();
    return { ...existing, status: 'online' };
  }

  await db
    .prepare('INSERT INTO users (id, email, name, avatar_url, status) VALUES (?, ?, ?, ?, ?)')
    .bind(user.id, user.email, user.name, user.avatar_url, 'online')
    .run();

  return user;
}
