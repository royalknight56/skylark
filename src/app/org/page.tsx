/**
 * 企业选择/加入页面
 * 用户首次登录或未选择企业时显示此页面
 * 支持：选择已加入的企业 / 创建新企业 / 通过邀请码加入
 * @author skylark
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  ArrowRight,
  Ticket,
  Users,
  Loader2,
  Check,
  AlertCircle,
  LogOut,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useAuth } from "@/lib/auth-context";
import type { Organization } from "@/lib/types";

type Tab = "select" | "create" | "join";

export default function OrgSelectPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [tab, setTab] = useState<Tab>("select");
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [orgName, setOrgName] = useState("");
  const [orgDesc, setOrgDesc] = useState("");

  const [inviteCode, setInviteCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState<Organization | null>(null);

  /** 初始化：从 API 获取企业列表 */
  useEffect(() => {
    fetch("/api/orgs")
      .then((res) => res.json() as Promise<{ success: boolean; data?: Organization[] }>)
      .then((json) => {
        if (json.success && json.data) {
          setOrgs(json.data);
          setSelectedOrgId(json.data[0]?.id || "");
        }
      })
      .catch(() => {})
      .finally(() => setPageLoading(false));
  }, []);

  const selectedOrg = useMemo(
    () => orgs.find((org) => org.id === selectedOrgId) || null,
    [orgs, selectedOrgId]
  );

  /** 选择企业进入 */
  const handleSelectOrg = async (org: Organization) => {
    setLoading(true);
    try {
      await fetch("/api/orgs/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: org.id }),
      });
    } catch {
      // 忽略
    }
    router.push("/messages");
  };

  /** 创建新企业 */
  const handleCreateOrg = async () => {
    if (!orgName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName.trim(), description: orgDesc.trim() }),
      });
      const data = (await res.json()) as { success: boolean; data?: Organization };
      if (data.success && data.data) {
        router.push("/messages");
        return;
      }
    } catch {
      // 忽略
    }
    setLoading(false);
  };

  /** 通过邀请码加入 */
  const handleJoinOrg = async () => {
    if (!inviteCode.trim()) return;
    setJoinError("");
    setJoinSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/orgs/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: inviteCode.trim() }),
      });
      const data = (await res.json()) as { success: boolean; data?: Organization; error?: string };
      if (data.success && data.data) {
        setJoinSuccess(data.data);
        setOrgs((prev) => [...prev, data.data!]);
        setSelectedOrgId(data.data.id);
      } else {
        setJoinError(data.error || "加入失败");
      }
    } catch {
      setJoinError("网络错误，请重试");
    }
    setLoading(false);
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-bg-page flex items-center justify-center">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center p-4 relative">
      <div className="w-full max-w-lg">
        {/* Logo + 标题 */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Skylark</h1>
          <p className="text-text-secondary mt-1">选择一个企业开始工作</p>
        </div>

        {/* 退出登录 */}
        <div className="absolute top-4 right-4">
          <button onClick={logout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-panel-bg hover:text-red-500 transition-colors">
            <LogOut size={16} /> 退出登录
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-1 p-1 bg-panel-border/50 rounded-xl mb-6">
          {([
            { key: "select" as Tab, label: "我的企业", icon: Building2 },
            { key: "create" as Tab, label: "创建企业", icon: Plus },
            { key: "join" as Tab, label: "加入企业", icon: Ticket },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setJoinError(""); setJoinSuccess(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-sm font-medium transition-colors
                ${tab === key
                  ? "bg-panel-bg text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
                }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        <div className="bg-panel-bg rounded-xl shadow-sm overflow-hidden h-[32rem] max-h-[calc(100dvh-13rem)] min-h-[26rem] flex flex-col">
          {/* Tab: 选择已有企业 */}
          {tab === "select" && (
            <>
            <div className="flex-1 overflow-y-auto p-2">
              {orgs.length === 0 ? (
                <div className="h-full min-h-0 flex flex-col items-center justify-center text-center px-4">
                  <Building2 size={40} className="text-text-placeholder mx-auto mb-3" />
                  <p className="text-text-secondary text-sm">还没有加入任何企业</p>
                  <p className="text-text-placeholder text-xs mt-1">
                    创建新企业或通过邀请码加入
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {orgs.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => setSelectedOrgId(org.id)}
                      disabled={loading}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left group
                        ${selectedOrgId === org.id ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-list-hover"}`}
                    >
                      <Avatar name={org.name} size="lg" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary">{org.name}</p>
                        {org.description && (
                          <p className="text-xs text-text-secondary truncate mt-0.5">
                            {org.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-1 text-xs text-text-placeholder">
                          <Users size={12} />
                          <span>{org.member_count || 0} 名成员</span>
                        </div>
                      </div>
                      {selectedOrgId === org.id ? (
                        <Check size={18} className="text-primary" />
                      ) : (
                        <ArrowRight
                          size={18}
                          className="text-text-placeholder group-hover:text-primary transition-colors"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="shrink-0 border-t border-panel-border p-4 bg-panel-bg">
              {orgs.length === 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTab("create")}
                    className="h-10 rounded-lg bg-primary text-white text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    创建企业
                  </button>
                  <button
                    onClick={() => setTab("join")}
                    className="h-10 rounded-lg border border-panel-border text-sm text-text-secondary font-medium flex items-center justify-center gap-2 hover:bg-list-hover"
                  >
                    <Ticket size={16} />
                    加入企业
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => selectedOrg && handleSelectOrg(selectedOrg)}
                  disabled={!selectedOrg || loading}
                  className="w-full h-10 rounded-lg bg-primary text-white text-sm font-medium
                    hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  进入企业
                </button>
              )}
            </div>
            </>
          )}

          {/* Tab: 创建新企业 */}
          {tab === "create" && (
            <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  企业名称 <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="例如：Skylark 科技"
                  className="w-full h-10 px-3 rounded-lg border border-panel-border bg-panel-bg
                    text-sm text-text-primary placeholder:text-text-placeholder
                    focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  企业简介
                </label>
                <textarea
                  value={orgDesc}
                  onChange={(e) => setOrgDesc(e.target.value)}
                  placeholder="简单介绍一下你的企业..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-panel-border bg-panel-bg
                    text-sm text-text-primary placeholder:text-text-placeholder
                    focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-colors resize-none"
                  />
              </div>
              <p className="text-xs text-text-placeholder text-center">
                创建后可通过邀请码邀请成员加入
              </p>
            </div>
            <div className="shrink-0 border-t border-panel-border p-4 bg-panel-bg">
              <button
                onClick={handleCreateOrg}
                disabled={!orgName.trim() || loading}
                className="w-full h-10 rounded-lg bg-primary text-white text-sm font-medium
                  hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                创建企业
              </button>
            </div>
            </>
          )}

          {/* Tab: 通过邀请码加入 */}
          {tab === "join" && (
            <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {joinSuccess ? (
                <div className="h-full min-h-0 flex flex-col items-center justify-center text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                    <Check size={24} className="text-success" />
                  </div>
                  <p className="text-sm font-semibold text-text-primary">
                    成功加入「{joinSuccess.name}」
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    {joinSuccess.member_count} 名成员
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">
                      邀请码
                    </label>
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => { setInviteCode(e.target.value); setJoinError(""); }}
                      placeholder="输入 6 位邀请码"
                      maxLength={10}
                      className="w-full h-10 px-3 rounded-lg border border-panel-border bg-panel-bg
                        text-sm text-text-primary placeholder:text-text-placeholder tracking-widest text-center
                        focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-colors uppercase"
                    />
                  </div>
                  {joinError && (
                    <div className="flex items-center gap-2 text-sm text-danger">
                      <AlertCircle size={14} />
                      {joinError}
                    </div>
                  )}
                  <p className="text-xs text-text-placeholder text-center">
                    向企业管理员获取邀请码
                  </p>
                </>
              )}
            </div>
            <div className="shrink-0 border-t border-panel-border p-4 bg-panel-bg">
              {joinSuccess ? (
                <button
                  onClick={() => handleSelectOrg(joinSuccess)}
                  disabled={loading}
                  className="w-full h-10 rounded-lg bg-primary text-white text-sm font-medium
                    hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  进入企业
                </button>
              ) : (
                <button
                  onClick={handleJoinOrg}
                  disabled={!inviteCode.trim() || loading}
                  className="w-full h-10 rounded-lg bg-primary text-white text-sm font-medium
                    hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Ticket size={16} />}
                  加入企业
                </button>
              )}
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
