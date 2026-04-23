/**
 * 认证工具
 * 生产环境：Cloudflare Access JWT → 用户身份
 * 开发环境：cookie skylark-uid → 数据库查用户
 * @author skylark
 */

import type { User } from './types';
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
