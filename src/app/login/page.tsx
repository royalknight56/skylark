/**
 * 登录/注册页面
 * 新用户输入姓名和邮箱即可创建账号进入系统
 * @author skylark
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, Mail, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { register, user, loading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /** 已登录则跳转 */
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/messages");
    }
  }, [authLoading, user, router]);

  if (!authLoading && user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setError("");
    setLoading(true);

    const ok = await register(name.trim(), email.trim());
    if (ok) {
      router.push("/org");
    } else {
      setError("注册失败，请重试");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">欢迎使用 Skylark</h1>
          <p className="text-text-secondary mt-2 text-sm">企业协作办公平台</p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="bg-panel-bg rounded-xl shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              姓名
            </label>
            <div className="relative">
              <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-placeholder" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入你的姓名"
                autoFocus
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-panel-border bg-panel-bg
                  text-sm text-text-primary placeholder:text-text-placeholder
                  focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              邮箱
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-placeholder" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-panel-border bg-panel-bg
                  text-sm text-text-primary placeholder:text-text-placeholder
                  focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={!name.trim() || !email.trim() || loading}
            className="w-full h-10 rounded-lg bg-primary text-white text-sm font-medium
              hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <UserPlus size={16} />
            )}
            进入 Skylark
          </button>

          <p className="text-xs text-text-placeholder text-center">
            首次使用将自动创建账号
          </p>
        </form>
      </div>
    </div>
  );
}
