/**
 * 认证上下文 - 全局管理当前登录用户
 * 应用启动时调用 /api/auth/me 检查登录态
 * 未登录则重定向到 /login
 * @author skylark
 */

"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import type { User } from "./types";

interface AuthContextValue {
  /** 当前登录用户（未登录或加载中为 null） */
  user: User | null;
  /** 是否正在检查登录态 */
  loading: boolean;
  /** 登录 */
  login: (email: string, password: string) => Promise<AuthResult>;
  /** 注册 */
  register: (name: string, email: string, password: string, referralUserId?: string) => Promise<AuthResult>;
  /** 登出 */
  logout: () => Promise<void>;
  /** 刷新当前用户信息 */
  refreshUser: () => Promise<void>;
}

interface AuthResult {
  success: boolean;
  error?: string;
  pendingVerification?: boolean;
  needsVerification?: boolean;
  email?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** 不需要登录的路径前缀 */
const PUBLIC_PATHS = ["/login", "/verify-email"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  /** 检查登录态 */
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const json = (await res.json()) as { success: boolean; data?: User };
        if (json.success && json.data) {
          setUser(json.data);
          return;
        }
      }
      setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  /** 未登录时重定向到 /login */
  useEffect(() => {
    if (loading) return;
    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
    if (!user && !isPublic) {
      router.replace("/login");
    }
  }, [user, loading, pathname, router]);

  /** 登录/注册公共请求 */
  const authenticate = useCallback(async (
    url: string,
    body: Record<string, string>
  ): Promise<AuthResult> => {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: User;
        error?: string;
        pending_verification?: boolean;
        needs_verification?: boolean;
        email?: string;
      };
      if (json.success && json.data) {
        setUser(json.data);
        return { success: true };
      }
      if (json.success && json.pending_verification) {
        setUser(null);
        return { success: true, pendingVerification: true, email: json.email };
      }
      return {
        success: false,
        error: json.error || "认证失败，请重试",
        needsVerification: json.needs_verification,
        email: json.email,
      };
    } catch {
      return { success: false, error: "网络异常，请稍后重试" };
    }
  }, []);

  /** 登录 */
  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    return authenticate("/api/auth/login", { email, password });
  }, [authenticate]);

  /** 注册 */
  const register = useCallback(async (
    name: string,
    email: string,
    password: string,
    referralUserId?: string
  ): Promise<AuthResult> => {
    return authenticate("/api/auth/register", {
      name,
      email,
      password,
      ...(referralUserId ? { referral_user_id: referralUserId } : {}),
    });
  }, [authenticate]);

  /** 登出 */
  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // 忽略
    }
    setUser(null);
    router.replace("/login");
  }, [router]);

  /** 刷新用户信息（在编辑个人资料后调用） */
  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const json = (await res.json()) as { success: boolean; data?: User };
        if (json.success && json.data) setUser(json.data);
      }
    } catch {
      // 忽略
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
