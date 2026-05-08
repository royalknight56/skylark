/**
 * 超级管理后台
 * @author skylark
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle, Building2, CheckCircle2, Loader2, LockKeyhole,
  LogOut, MessageSquareWarning, RefreshCw, Users,
} from "lucide-react";

interface ApiResult<T> {
  success: boolean;
  configured?: boolean;
  authenticated?: boolean;
  data?: T;
  error?: string;
}

interface FeedbackItem {
  id: string;
  org_id: string | null;
  user_id: string;
  type: string;
  title: string;
  content: string;
  contact: string | null;
  page_url: string | null;
  user_agent: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  user_name: string | null;
  user_email: string | null;
  org_name: string | null;
}

interface OverviewData {
  users: number;
  organizations: number;
  feedback: number;
  open_feedback: number;
  feedback_by_status: { status: string; count: number }[];
  feedback_by_type: { type: string; count: number }[];
  recent_feedback: FeedbackItem[];
}

const typeLabel: Record<string, string> = {
  bug: "产品问题",
  suggestion: "功能建议",
  experience: "体验反馈",
  other: "其他",
};

const statusLabel: Record<string, string> = {
  open: "待处理",
  processing: "处理中",
  resolved: "已解决",
  closed: "已关闭",
};

function formatTime(value: string): string {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-panel-bg border border-panel-border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary">{label}</span>
        <Icon size={18} className="text-primary" />
      </div>
      <p className="mt-3 text-3xl font-bold text-text-primary">{value}</p>
    </div>
  );
}

export default function SuperAdminPage() {
  const params = useParams<{ key: string }>();
  const pathKey = Array.isArray(params.key) ? params.key[0] : params.key;
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [error, setError] = useState("");

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/super-admin/overview");
      const json = (await res.json()) as ApiResult<OverviewData>;
      if (!json.success || !json.data) throw new Error(json.error || "加载失败");
      setOverview(json.data);
      setAuthenticated(true);
    } catch (err) {
      setAuthenticated(false);
      setOverview(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/super-admin/session");
        const json = (await res.json()) as ApiResult<null>;
        if (!active) return;
        if (!json.success) throw new Error(json.error || "会话检查失败");
        if (json.authenticated) {
          await loadOverview();
        } else {
          setAuthenticated(false);
          setLoading(false);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    };
    checkSession();
    return () => { active = false; };
  }, [loadOverview]);

  const handleLogin = async () => {
    if (!password.trim() || loggingIn) return;
    setLoggingIn(true);
    setError("");
    try {
      const res = await fetch("/api/super-admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path_key: pathKey, password }),
      });
      const json = (await res.json()) as ApiResult<null>;
      if (!json.success) throw new Error(json.error || "登录失败");
      setPassword("");
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/super-admin/session", { method: "DELETE" });
    setAuthenticated(false);
    setOverview(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-page flex items-center justify-center">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-bg-page flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-panel-bg border border-panel-border rounded-xl shadow-sm p-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
            <LockKeyhole size={24} />
          </div>
          <h1 className="text-xl font-bold text-text-primary">超级管理后台</h1>
          <p className="text-sm text-text-secondary mt-2">请输入超级管理口令。</p>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") handleLogin(); }}
            placeholder="超级管理口令"
            className="mt-5 w-full h-10 rounded-lg border border-panel-border px-3 text-sm outline-none focus:border-primary"
            autoFocus
          />
          {error && (
            <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-danger flex gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <button
            onClick={handleLogin}
            disabled={!password.trim() || loggingIn}
            className="mt-4 w-full h-10 rounded-lg bg-primary text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loggingIn && <Loader2 size={15} className="animate-spin" />}
            进入后台
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-page overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">超级管理后台</h1>
            <p className="text-sm text-text-secondary mt-1">平台级数据总览</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadOverview}
              className="h-9 px-3 rounded-lg border border-panel-border bg-panel-bg text-sm text-text-secondary hover:bg-list-hover flex items-center gap-2"
            >
              <RefreshCw size={15} />
              刷新
            </button>
            <button
              onClick={handleLogout}
              className="h-9 px-3 rounded-lg border border-panel-border bg-panel-bg text-sm text-text-secondary hover:bg-list-hover flex items-center gap-2"
            >
              <LogOut size={15} />
              退出
            </button>
          </div>
        </header>

        {overview && (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard icon={Users} label="已注册用户" value={overview.users} />
              <StatCard icon={Building2} label="企业数量" value={overview.organizations} />
              <StatCard icon={MessageSquareWarning} label="反馈总数" value={overview.feedback} />
              <StatCard icon={CheckCircle2} label="待处理反馈" value={overview.open_feedback} />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <div className="bg-panel-bg border border-panel-border rounded-lg p-4">
                <h2 className="text-sm font-semibold text-text-primary mb-3">反馈状态</h2>
                <div className="space-y-2">
                  {overview.feedback_by_status.map((item) => (
                    <div key={item.status} className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">{statusLabel[item.status] || item.status}</span>
                      <span className="font-semibold text-text-primary">{item.count}</span>
                    </div>
                  ))}
                  {overview.feedback_by_status.length === 0 && <p className="text-sm text-text-placeholder">暂无反馈</p>}
                </div>
              </div>
              <div className="bg-panel-bg border border-panel-border rounded-lg p-4">
                <h2 className="text-sm font-semibold text-text-primary mb-3">反馈类型</h2>
                <div className="space-y-2">
                  {overview.feedback_by_type.map((item) => (
                    <div key={item.type} className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">{typeLabel[item.type] || item.type}</span>
                      <span className="font-semibold text-text-primary">{item.count}</span>
                    </div>
                  ))}
                  {overview.feedback_by_type.length === 0 && <p className="text-sm text-text-placeholder">暂无反馈</p>}
                </div>
              </div>
            </section>

            <section className="bg-panel-bg border border-panel-border rounded-lg overflow-hidden">
              <div className="h-12 px-4 flex items-center justify-between border-b border-panel-border">
                <h2 className="text-sm font-semibold text-text-primary">问题反馈</h2>
                <span className="text-xs text-text-placeholder">最近 100 条</span>
              </div>
              <div className="divide-y divide-panel-border">
                {overview.recent_feedback.map((feedback) => (
                  <div key={feedback.id} className="p-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
                            {typeLabel[feedback.type] || feedback.type}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-list-hover text-text-secondary text-[11px] font-medium">
                            {statusLabel[feedback.status] || feedback.status}
                          </span>
                          <span className="text-xs text-text-placeholder">{formatTime(feedback.created_at)}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-text-primary">{feedback.title}</h3>
                        <p className="text-sm text-text-secondary mt-2 whitespace-pre-wrap break-words">{feedback.content}</p>
                      </div>
                      <div className="md:text-right text-xs text-text-placeholder shrink-0 space-y-1">
                        <p>{feedback.user_name || feedback.user_email || feedback.user_id}</p>
                        <p>{feedback.org_name || "无企业"}</p>
                        {feedback.contact && <p>{feedback.contact}</p>}
                      </div>
                    </div>
                    {feedback.page_url && (
                      <a href={feedback.page_url} target="_blank" rel="noreferrer"
                        className="mt-2 inline-block text-xs text-primary hover:underline break-all">
                        {feedback.page_url}
                      </a>
                    )}
                  </div>
                ))}
                {overview.recent_feedback.length === 0 && (
                  <div className="p-10 text-center text-sm text-text-placeholder">暂无反馈</div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
