/**
 * 超级管理后台
 * @author skylark
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle, Building2, CheckCircle2, Loader2, LockKeyhole,
  ChevronLeft, ChevronRight, LogOut, MessageSquareWarning, RefreshCw, Users, X,
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

interface UserItem {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  login_phone: string | null;
  status: string;
  status_text: string | null;
  current_org_id: string | null;
  created_at: string;
  current_org_name: string | null;
  joined_org_count: number;
}

interface OrganizationItem {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  owner_id: string;
  owner_name: string | null;
  owner_email: string | null;
  member_count: number;
  active_member_count: number;
  created_at: string;
}

interface OverviewData {
  users: number;
  organizations: number;
  feedback: number;
  open_feedback: number;
  feedback_by_status: { status: string; count: number }[];
  feedback_by_type: { type: string; count: number }[];
  recent_users: UserItem[];
  users_page: number;
  users_page_size: number;
  users_total: number;
  organization_list: OrganizationItem[];
  organizations_page: number;
  organizations_page_size: number;
  organizations_total: number;
  recent_feedback: FeedbackItem[];
}

interface UserDetailData {
  kind: "user";
  user: UserItem & {
    status_emoji: string | null;
    signature: string | null;
    current_org_name: string | null;
  };
  orgs: Array<{
    org_id: string;
    org_name: string;
    role: string;
    department: string | null;
    title: string | null;
    employee_id: string | null;
    phone: string | null;
    work_city: string | null;
    gender: string | null;
    employee_type: string | null;
    member_status: string;
    joined_at: string;
  }>;
  feedback: Array<FeedbackItem & { org_name: string | null }>;
}

interface OrganizationDetailData {
  kind: "organization";
  organization: OrganizationItem & {
    logo_url: string | null;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    website: string | null;
    address: string | null;
    invite_code: string | null;
    require_approval: number | boolean;
  };
  members: Array<{
    user_id: string;
    name: string;
    email: string;
    login_phone: string | null;
    user_status: string;
    role: string;
    department: string | null;
    title: string | null;
    employee_id: string | null;
    phone: string | null;
    work_city: string | null;
    gender: string | null;
    employee_type: string | null;
    member_status: string;
    joined_at: string;
  }>;
  feedback: Array<FeedbackItem & { user_name: string | null; user_email: string | null }>;
}

type DetailData = UserDetailData | OrganizationDetailData;

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

const userStatusLabel: Record<string, string> = {
  online: "在线",
  busy: "忙碌",
  away: "离开",
  offline: "离线",
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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-text-placeholder mb-1">{label}</p>
      <div className="text-sm text-text-primary break-words">{value || "未填写"}</div>
    </div>
  );
}

function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div className="h-11 px-4 flex items-center justify-between border-t border-panel-border bg-bg-page">
      <span className="text-xs text-text-placeholder">
        {start}-{end} / {total}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="w-8 h-8 rounded-md border border-panel-border bg-panel-bg flex items-center justify-center text-text-secondary hover:bg-list-hover disabled:opacity-40"
          title="上一页"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-xs text-text-secondary">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="w-8 h-8 rounded-md border border-panel-border bg-panel-bg flex items-center justify-center text-text-secondary hover:bg-list-hover disabled:opacity-40"
          title="下一页"
        >
          <ChevronRight size={15} />
        </button>
      </div>
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
  const [userPage, setUserPage] = useState(1);
  const [orgPage, setOrgPage] = useState(1);
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        user_page: String(userPage),
        user_page_size: "20",
        org_page: String(orgPage),
        org_page_size: "20",
      });
      const res = await fetch(`/api/super-admin/overview?${params.toString()}`);
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
  }, [orgPage, userPage]);

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

  const openDetail = async (type: "user" | "organization", id: string) => {
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      const params = new URLSearchParams({ type, id });
      const res = await fetch(`/api/super-admin/details?${params.toString()}`);
      const json = (await res.json()) as ApiResult<DetailData>;
      if (!json.success || !json.data) throw new Error(json.error || "加载详情失败");
      setDetail(json.data);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen h-dvh bg-bg-page flex items-center justify-center">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="h-screen h-dvh bg-bg-page flex items-center justify-center px-4 overflow-y-auto">
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
    <div className="h-screen h-dvh bg-bg-page overflow-y-auto">
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

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
              <div className="bg-panel-bg border border-panel-border rounded-lg overflow-hidden">
                <div className="h-12 px-4 flex items-center justify-between border-b border-panel-border">
                  <h2 className="text-sm font-semibold text-text-primary">用户信息</h2>
                  <span className="text-xs text-text-placeholder">分页查看</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[42rem] text-sm">
                    <thead className="bg-bg-page text-xs text-text-secondary">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">用户</th>
                        <th className="px-4 py-2 text-left font-medium">状态</th>
                        <th className="px-4 py-2 text-left font-medium">当前企业</th>
                        <th className="px-4 py-2 text-left font-medium">企业数</th>
                        <th className="px-4 py-2 text-left font-medium">注册时间</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-panel-border">
                      {overview.recent_users.map((item) => (
                        <tr
                          key={item.id}
                          onClick={() => openDetail("user", item.id)}
                          className="hover:bg-list-hover/60 cursor-pointer"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-text-primary">{item.name}</p>
                            <p className="text-xs text-text-placeholder">{item.email}</p>
                            {item.login_phone && <p className="text-xs text-text-placeholder">{item.login_phone}</p>}
                          </td>
                          <td className="px-4 py-3 text-text-secondary">
                            {userStatusLabel[item.status] || item.status}
                            {item.status_text && <p className="text-xs text-text-placeholder mt-0.5">{item.status_text}</p>}
                          </td>
                          <td className="px-4 py-3 text-text-secondary">{item.current_org_name || "未选择"}</td>
                          <td className="px-4 py-3 text-text-secondary">{item.joined_org_count}</td>
                          <td className="px-4 py-3 text-text-placeholder">{formatTime(item.created_at)}</td>
                        </tr>
                      ))}
                      {overview.recent_users.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-10 text-center text-text-placeholder">暂无用户</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={overview.users_page}
                  pageSize={overview.users_page_size}
                  total={overview.users_total}
                  onPageChange={setUserPage}
                />
              </div>

              <div className="bg-panel-bg border border-panel-border rounded-lg overflow-hidden">
                <div className="h-12 px-4 flex items-center justify-between border-b border-panel-border">
                  <h2 className="text-sm font-semibold text-text-primary">企业数量信息</h2>
                  <span className="text-xs text-text-placeholder">分页查看</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[42rem] text-sm">
                    <thead className="bg-bg-page text-xs text-text-secondary">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">企业</th>
                        <th className="px-4 py-2 text-left font-medium">成员</th>
                        <th className="px-4 py-2 text-left font-medium">所有者</th>
                        <th className="px-4 py-2 text-left font-medium">行业</th>
                        <th className="px-4 py-2 text-left font-medium">创建时间</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-panel-border">
                      {overview.organization_list.map((item) => (
                        <tr
                          key={item.id}
                          onClick={() => openDetail("organization", item.id)}
                          className="hover:bg-list-hover/60 cursor-pointer"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-text-primary">{item.name}</p>
                            {item.description && <p className="text-xs text-text-placeholder line-clamp-1">{item.description}</p>}
                          </td>
                          <td className="px-4 py-3 text-text-secondary">
                            <p>{item.member_count} 人</p>
                            <p className="text-xs text-text-placeholder">活跃 {item.active_member_count} 人</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-text-secondary">{item.owner_name || item.owner_id}</p>
                            {item.owner_email && <p className="text-xs text-text-placeholder">{item.owner_email}</p>}
                          </td>
                          <td className="px-4 py-3 text-text-secondary">{item.industry || "未填写"}</td>
                          <td className="px-4 py-3 text-text-placeholder">{formatTime(item.created_at)}</td>
                        </tr>
                      ))}
                      {overview.organization_list.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-10 text-center text-text-placeholder">暂无企业</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={overview.organizations_page}
                  pageSize={overview.organizations_page_size}
                  total={overview.organizations_total}
                  onPageChange={setOrgPage}
                />
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

      {(detailLoading || detail || detailError) && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-4" onClick={() => { setDetail(null); setDetailError(""); }}>
          <div
            className="w-full max-w-4xl max-h-[calc(100dvh-2rem)] bg-panel-bg rounded-xl shadow-2xl border border-panel-border overflow-hidden flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="h-12 px-5 border-b border-panel-border flex items-center justify-between shrink-0">
              <h2 className="text-base font-semibold text-text-primary">
                {detail?.kind === "organization" ? "企业详细信息" : "个人详细信息"}
                {detailLoading && "加载中"}
              </h2>
              <button
                onClick={() => { setDetail(null); setDetailError(""); }}
                className="w-8 h-8 rounded-md flex items-center justify-center text-text-placeholder hover:bg-list-hover"
                title="关闭"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {detailLoading && (
                <div className="py-16 flex items-center justify-center">
                  <Loader2 size={28} className="text-primary animate-spin" />
                </div>
              )}

              {detailError && !detailLoading && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{detailError}</div>
              )}

              {detail?.kind === "user" && (
                <div className="space-y-6">
                  <section>
                    <h3 className="text-sm font-semibold text-text-primary mb-3">基础信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <InfoRow label="姓名" value={detail.user.name} />
                      <InfoRow label="邮箱" value={detail.user.email} />
                      <InfoRow label="手机号" value={detail.user.login_phone} />
                      <InfoRow label="在线状态" value={userStatusLabel[detail.user.status] || detail.user.status} />
                      <InfoRow label="当前企业" value={detail.user.current_org_name} />
                      <InfoRow label="注册时间" value={formatTime(detail.user.created_at)} />
                      <InfoRow label="状态文案" value={detail.user.status_text} />
                      <InfoRow label="个性签名" value={detail.user.signature} />
                      <InfoRow label="用户 ID" value={detail.user.id} />
                    </div>
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold text-text-primary mb-3">加入企业</h3>
                    <div className="overflow-x-auto border border-panel-border rounded-lg">
                      <table className="w-full min-w-[42rem] text-sm">
                        <thead className="bg-bg-page text-xs text-text-secondary">
                          <tr>
                            <th className="px-3 py-2 text-left">企业</th>
                            <th className="px-3 py-2 text-left">角色</th>
                            <th className="px-3 py-2 text-left">部门/职位</th>
                            <th className="px-3 py-2 text-left">状态</th>
                            <th className="px-3 py-2 text-left">加入时间</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-panel-border">
                          {detail.orgs.map((org) => (
                            <tr key={org.org_id}>
                              <td className="px-3 py-2">{org.org_name}</td>
                              <td className="px-3 py-2">{org.role}</td>
                              <td className="px-3 py-2">{[org.department, org.title].filter(Boolean).join(" / ") || "未填写"}</td>
                              <td className="px-3 py-2">{org.member_status}</td>
                              <td className="px-3 py-2 text-text-placeholder">{formatTime(org.joined_at)}</td>
                            </tr>
                          ))}
                          {detail.orgs.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-text-placeholder">暂无企业</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold text-text-primary mb-3">提交反馈</h3>
                    <div className="space-y-2">
                      {detail.feedback.map((item) => (
                        <div key={item.id} className="rounded-lg border border-panel-border p-3">
                          <div className="flex items-center gap-2 text-xs text-text-placeholder mb-1">
                            <span>{typeLabel[item.type] || item.type}</span>
                            <span>{statusLabel[item.status] || item.status}</span>
                            <span>{formatTime(item.created_at)}</span>
                          </div>
                          <p className="text-sm font-medium text-text-primary">{item.title}</p>
                          <p className="text-sm text-text-secondary mt-1 whitespace-pre-wrap">{item.content}</p>
                        </div>
                      ))}
                      {detail.feedback.length === 0 && <p className="text-sm text-text-placeholder">暂无反馈</p>}
                    </div>
                  </section>
                </div>
              )}

              {detail?.kind === "organization" && (
                <div className="space-y-6">
                  <section>
                    <h3 className="text-sm font-semibold text-text-primary mb-3">基础信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <InfoRow label="企业名称" value={detail.organization.name} />
                      <InfoRow label="企业 ID" value={detail.organization.id} />
                      <InfoRow label="行业" value={detail.organization.industry} />
                      <InfoRow label="成员数" value={`${detail.organization.member_count} 人`} />
                      <InfoRow label="活跃成员" value={`${detail.organization.active_member_count} 人`} />
                      <InfoRow label="创建时间" value={formatTime(detail.organization.created_at)} />
                      <InfoRow label="所有者" value={detail.organization.owner_name || detail.organization.owner_id} />
                      <InfoRow label="所有者邮箱" value={detail.organization.owner_email} />
                      <InfoRow label="邀请码" value={detail.organization.invite_code} />
                      <InfoRow label="联系人" value={detail.organization.contact_name} />
                      <InfoRow label="联系邮箱" value={detail.organization.contact_email} />
                      <InfoRow label="联系电话" value={detail.organization.contact_phone} />
                      <InfoRow label="网站" value={detail.organization.website} />
                      <InfoRow label="地址" value={detail.organization.address} />
                      <InfoRow label="简介" value={detail.organization.description} />
                    </div>
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold text-text-primary mb-3">成员列表</h3>
                    <div className="overflow-x-auto border border-panel-border rounded-lg">
                      <table className="w-full min-w-[48rem] text-sm">
                        <thead className="bg-bg-page text-xs text-text-secondary">
                          <tr>
                            <th className="px-3 py-2 text-left">成员</th>
                            <th className="px-3 py-2 text-left">角色</th>
                            <th className="px-3 py-2 text-left">部门/职位</th>
                            <th className="px-3 py-2 text-left">成员状态</th>
                            <th className="px-3 py-2 text-left">加入时间</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-panel-border">
                          {detail.members.map((member) => (
                            <tr key={member.user_id}>
                              <td className="px-3 py-2">
                                <p className="text-text-primary">{member.name}</p>
                                <p className="text-xs text-text-placeholder">{member.email}</p>
                              </td>
                              <td className="px-3 py-2">{member.role}</td>
                              <td className="px-3 py-2">{[member.department, member.title].filter(Boolean).join(" / ") || "未填写"}</td>
                              <td className="px-3 py-2">{member.member_status}</td>
                              <td className="px-3 py-2 text-text-placeholder">{formatTime(member.joined_at)}</td>
                            </tr>
                          ))}
                          {detail.members.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-text-placeholder">暂无成员</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold text-text-primary mb-3">企业反馈</h3>
                    <div className="space-y-2">
                      {detail.feedback.map((item) => (
                        <div key={item.id} className="rounded-lg border border-panel-border p-3">
                          <div className="flex items-center gap-2 text-xs text-text-placeholder mb-1">
                            <span>{item.user_name || item.user_email || item.user_id}</span>
                            <span>{typeLabel[item.type] || item.type}</span>
                            <span>{statusLabel[item.status] || item.status}</span>
                            <span>{formatTime(item.created_at)}</span>
                          </div>
                          <p className="text-sm font-medium text-text-primary">{item.title}</p>
                          <p className="text-sm text-text-secondary mt-1 whitespace-pre-wrap">{item.content}</p>
                        </div>
                      ))}
                      {detail.feedback.length === 0 && <p className="text-sm text-text-placeholder">暂无反馈</p>}
                    </div>
                  </section>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
