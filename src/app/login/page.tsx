/**
 * 登录/注册页面
 * 支持邮箱密码登录与注册
 * @author skylark
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, Mail, User as UserIcon, Lock, LogIn, MailCheck, RefreshCcw } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type AuthMode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const { login, register, user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [referralUserId, setReferralUserId] = useState("");

  /** 已登录则跳转 */
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/messages");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref") || window.localStorage.getItem("skylark_referral_user_id") || "";
    if (!ref) return;
    window.localStorage.setItem("skylark_referral_user_id", ref);
    setReferralUserId(ref);
    setMode("register");
  }, []);

  if (!authLoading && user) return null;

  const isRegister = mode === "register";
  const canSubmit = Boolean(email.trim() && password && (!isRegister || (name.trim() && confirmPassword)));

  /** 前端基础校验，后端仍会做最终校验 */
  const validateForm = () => {
    if (!email.trim() || !password) return "邮箱和密码不能为空";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "邮箱格式不正确";
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return "密码至少 8 位，且必须包含字母和数字";
    }
    if (isRegister && !name.trim()) return "姓名不能为空";
    if (isRegister && password !== confirmPassword) return "两次输入的密码不一致";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    const result = isRegister
      ? await register(name.trim(), email.trim(), password, referralUserId)
      : await login(email.trim(), password);
    if (result.success) {
      if (isRegister && result.pendingVerification) {
        if (referralUserId) {
          window.localStorage.removeItem("skylark_referral_user_id");
        }
        setVerificationEmail(result.email || email.trim());
        setPassword("");
        setConfirmPassword("");
      } else {
        router.push(isRegister ? "/org" : "/messages");
      }
    } else if (result.needsVerification) {
      setVerificationEmail(result.email || email.trim());
      setPassword("");
    } else {
      setError(result.error || "认证失败，请重试");
    }
    setLoading(false);
  };

  const handleResend = async () => {
    const targetEmail = verificationEmail || email.trim();
    if (!targetEmail) return;
    setResendMessage("");
    setError("");
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (json.success) {
        setResendMessage("验证邮件已重新发送");
      } else {
        setError(json.error || "发送失败，请稍后重试");
      }
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setResending(false);
    }
  };

  const resetToLogin = () => {
    setMode("login");
    setVerificationEmail("");
    setResendMessage("");
    setError("");
    setPassword("");
    setConfirmPassword("");
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

        {verificationEmail ? (
          <div className="bg-panel-bg rounded-xl shadow-sm p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <MailCheck size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">验证邮件已发送</h2>
              <p className="text-sm text-text-secondary mt-2 leading-6">
                我们已向 <span className="font-medium text-text-primary break-all">{verificationEmail}</span> 发送验证链接，请在 30 分钟内完成验证。
              </p>
            </div>

            {resendMessage && <p className="text-sm text-success">{resendMessage}</p>}
            {error && <p className="text-sm text-danger">{error}</p>}

            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="w-full h-10 rounded-lg bg-primary text-white text-sm font-medium
                hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
            >
              {resending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
              重新发送验证邮件
            </button>
            <button
              type="button"
              onClick={resetToLogin}
              className="w-full h-10 rounded-lg border border-panel-border text-text-primary text-sm font-medium
                hover:bg-bg-page transition-colors"
            >
              返回登录
            </button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="bg-panel-bg rounded-xl shadow-sm p-6 space-y-4">
          {/* 模式切换 */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-bg-page rounded-lg">
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); setResendMessage(""); }}
              className={`h-8 rounded-md text-sm font-medium transition-colors
                ${!isRegister ? "bg-panel-bg text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setError(""); setResendMessage(""); }}
              className={`h-8 rounded-md text-sm font-medium transition-colors
                ${isRegister ? "bg-panel-bg text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
            >
              注册
            </button>
          </div>

          {isRegister && (
            <div>
              {referralUserId && (
                <div className="mb-3 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
                  已绑定分享邀请，完成邮箱验证后会计入邀请人活动进度
                </div>
              )}
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
          )}

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
                autoFocus={!isRegister}
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-panel-border bg-panel-bg
                  text-sm text-text-primary placeholder:text-text-placeholder
                  focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              密码
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-placeholder" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 8 位，包含字母和数字"
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-panel-border bg-panel-bg
                  text-sm text-text-primary placeholder:text-text-placeholder
                  focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                确认密码
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-placeholder" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-panel-border bg-panel-bg
                    text-sm text-text-primary placeholder:text-text-placeholder
                    focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="w-full h-10 rounded-lg bg-primary text-white text-sm font-medium
              hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isRegister ? (
              <UserPlus size={16} />
            ) : (
              <LogIn size={16} />
            )}
            {isRegister ? "注册 Skylark" : "登录 Skylark"}
          </button>

          <p className="text-xs text-text-placeholder text-center">
            {isRegister ? "注册后需要先完成邮箱验证" : "还没有账号？切换到注册创建新账号"}
          </p>
        </form>
        )}
      </div>
    </div>
  );
}
