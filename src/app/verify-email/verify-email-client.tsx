"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, MailWarning } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type VerifyState = "loading" | "success" | "error";

export default function VerifyEmailClient({ token }: { token: string }) {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [state, setState] = useState<VerifyState>("loading");
  const [message, setMessage] = useState("正在验证邮箱");

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (!token) {
        setState("error");
        setMessage("验证链接无效，请重新发送验证邮件");
        return;
      }

      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const json = (await res.json()) as { success: boolean; error?: string };
        if (cancelled) return;

        if (json.success) {
          await refreshUser();
          if (cancelled) return;
          setState("success");
          setMessage("邮箱验证成功");
        } else {
          setState("error");
          setMessage(json.error || "验证失败，请重新发送验证邮件");
        }
      } catch {
        if (cancelled) return;
        setState("error");
        setMessage("网络异常，请稍后重试");
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [refreshUser, token]);

  return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Skylark</h1>
        </div>

        <div className="bg-panel-bg rounded-xl shadow-sm p-6 space-y-5 text-center">
          <div className={`w-12 h-12 rounded-xl mx-auto flex items-center justify-center ${
            state === "success" ? "bg-success/10 text-success" : state === "error" ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"
          }`}>
            {state === "loading" && <Loader2 size={24} className="animate-spin" />}
            {state === "success" && <CheckCircle2 size={24} />}
            {state === "error" && <MailWarning size={24} />}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{message}</h2>
            <p className="text-sm text-text-secondary mt-2">
              {state === "loading" && "请稍候，正在确认你的验证链接。"}
              {state === "success" && "现在可以进入工作台继续使用。"}
              {state === "error" && "可以返回登录页重新发送验证邮件。"}
            </p>
          </div>

          {state === "success" ? (
            <button
              type="button"
              onClick={() => router.replace("/org")}
              className="w-full h-10 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              进入 Skylark
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.replace("/login")}
              disabled={state === "loading"}
              className="w-full h-10 rounded-lg border border-panel-border text-text-primary text-sm font-medium
                hover:bg-bg-page transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              返回登录
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
