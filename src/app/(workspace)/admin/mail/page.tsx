/**
 * 管理后台 - 企业邮箱管理页
 * @author skylark
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Plus, RefreshCw, Loader2, CheckCircle2, AlertCircle, UserPlus } from "lucide-react";
import { useOrg } from "@/lib/org-context";
import type { MailAccount, MailDomain, OrgMember } from "@/lib/types";

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export default function AdminMailPage() {
  const { currentOrg } = useOrg();
  const [domains, setDomains] = useState<MailDomain[]>([]);
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [domain, setDomain] = useState("");
  const [localPart, setLocalPart] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  /** 加载邮箱配置 */
  const loadData = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    setError("");
    try {
      const [domainRes, accountRes, memberRes] = await Promise.all([
        fetch(`/api/admin/mail/domains?org_id=${currentOrg.id}`),
        fetch(`/api/admin/mail/accounts?org_id=${currentOrg.id}`),
        fetch(`/api/admin/members?org_id=${currentOrg.id}`),
      ]);
      const domainJson = (await domainRes.json()) as ApiResult<MailDomain[]>;
      const accountJson = (await accountRes.json()) as ApiResult<MailAccount[]>;
      const memberJson = (await memberRes.json()) as ApiResult<OrgMember[]>;
      if (!domainJson.success) throw new Error(domainJson.error || "加载域名失败");
      if (!accountJson.success) throw new Error(accountJson.error || "加载账号失败");
      if (!memberJson.success) throw new Error(memberJson.error || "加载成员失败");
      setDomains(domainJson.data || []);
      setAccounts(accountJson.data || []);
      setMembers(memberJson.data || []);
      if (!selectedDomainId && domainJson.data?.[0]) setSelectedDomainId(domainJson.data[0].id);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [currentOrg, selectedDomainId]);

  useEffect(() => { loadData(); }, [loadData]);

  /** 新增企业邮箱域名 */
  const handleCreateDomain = async () => {
    if (!currentOrg || !domain.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/mail/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: currentOrg.id, domain: domain.trim() }),
      });
      const json = (await res.json()) as ApiResult<MailDomain>;
      if (!json.success) throw new Error(json.error || "新增域名失败");
      setDomain("");
      await loadData();
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  /** 切换域名启用状态 */
  const handleUpdateDomain = async (item: MailDomain, status: MailDomain["status"], routingEnabled: boolean) => {
    if (!currentOrg) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/mail/domains/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: currentOrg.id, status, routing_enabled: routingEnabled }),
      });
      const json = (await res.json()) as ApiResult<MailDomain>;
      if (!json.success) throw new Error(json.error || "更新域名失败");
      await loadData();
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  /** 分配邮箱账号 */
  const handleCreateAccount = async () => {
    if (!currentOrg || !selectedUserId || !selectedDomainId || !localPart.trim() || !displayName.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/mail/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: currentOrg.id,
          user_id: selectedUserId,
          domain_id: selectedDomainId,
          local_part: localPart.trim(),
          display_name: displayName.trim(),
          is_default: true,
        }),
      });
      const json = (await res.json()) as ApiResult<MailAccount>;
      if (!json.success) throw new Error(json.error || "分配邮箱失败");
      setLocalPart("");
      setDisplayName("");
      setSelectedUserId("");
      await loadData();
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const activeDomains = domains.filter((item) => item.status !== "disabled");

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={28} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Mail size={24} className="text-primary" /> 企业邮箱
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            配置企业域名，给成员分配邮箱地址，并将 Cloudflare Email Routing 路由到当前 Worker。
          </p>
        </div>
        <button onClick={loadData} className="h-9 px-3 rounded-lg border border-panel-border text-sm flex items-center gap-2 hover:bg-list-hover">
          <RefreshCw size={14} /> 刷新
        </button>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-sm text-danger">{error}</div>}

      <section className="bg-panel-bg rounded-xl border border-panel-border p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-text-primary">邮箱域名</h2>
          <p className="text-xs text-text-placeholder mt-1">
            新增域名后，请在 Cloudflare 控制台启用 Email Routing，并把对应地址路由到 Worker。
          </p>
        </div>
        <div className="flex gap-2">
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="company.com"
            className="h-10 flex-1 rounded-lg border border-panel-border px-3 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={handleCreateDomain}
            disabled={!domain.trim() || submitting}
            className="h-10 px-4 rounded-lg bg-primary text-white text-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Plus size={16} /> 新增域名
          </button>
        </div>
        <div className="divide-y divide-panel-border">
          {domains.map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-text-primary">{item.domain}</p>
                <p className="text-xs text-text-placeholder">
                  状态：{item.status} · Routing：{item.routing_enabled ? "已配置" : "未确认"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateDomain(item, "active", true)}
                  className="h-8 px-3 rounded-lg text-xs bg-green-50 text-green-700 flex items-center gap-1"
                >
                  <CheckCircle2 size={13} /> 标记可用
                </button>
                <button
                  onClick={() => handleUpdateDomain(item, "disabled", item.routing_enabled)}
                  className="h-8 px-3 rounded-lg text-xs bg-red-50 text-red-600 flex items-center gap-1"
                >
                  <AlertCircle size={13} /> 禁用
                </button>
              </div>
            </div>
          ))}
          {domains.length === 0 && <p className="py-6 text-sm text-text-placeholder text-center">暂无邮箱域名</p>}
        </div>
      </section>

      <section className="bg-panel-bg rounded-xl border border-panel-border p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-text-primary">分配邮箱账号</h2>
          <p className="text-xs text-text-placeholder mt-1">为企业成员分配 localPart@domain 的企业邮箱地址。</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}
            className="h-10 rounded-lg border border-panel-border px-3 text-sm outline-none focus:border-primary">
            <option value="">选择成员</option>
            {members.map((member) => (
              <option key={member.user_id} value={member.user_id}>{member.user?.name || member.user_id}</option>
            ))}
          </select>
          <input value={localPart} onChange={(e) => setLocalPart(e.target.value)}
            placeholder="邮箱前缀，如 zhangsan"
            className="h-10 rounded-lg border border-panel-border px-3 text-sm outline-none focus:border-primary" />
          <select value={selectedDomainId} onChange={(e) => setSelectedDomainId(e.target.value)}
            className="h-10 rounded-lg border border-panel-border px-3 text-sm outline-none focus:border-primary">
            <option value="">选择域名</option>
            {activeDomains.map((item) => <option key={item.id} value={item.id}>@{item.domain}</option>)}
          </select>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            placeholder="发件显示名"
            className="h-10 rounded-lg border border-panel-border px-3 text-sm outline-none focus:border-primary" />
        </div>
        <button
          onClick={handleCreateAccount}
          disabled={!selectedUserId || !selectedDomainId || !localPart.trim() || !displayName.trim() || submitting}
          className="h-10 px-4 rounded-lg bg-primary text-white text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <UserPlus size={16} /> 分配邮箱
        </button>
        <div className="overflow-x-auto border border-panel-border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-bg-page text-text-secondary">
              <tr>
                <th className="text-left px-3 py-2 font-medium">邮箱地址</th>
                <th className="text-left px-3 py-2 font-medium">成员</th>
                <th className="text-left px-3 py-2 font-medium">显示名</th>
                <th className="text-left px-3 py-2 font-medium">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-panel-border">
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td className="px-3 py-2 text-text-primary">{account.address}</td>
                  <td className="px-3 py-2 text-text-secondary">{account.user?.name || account.user_id}</td>
                  <td className="px-3 py-2 text-text-secondary">{account.display_name}</td>
                  <td className="px-3 py-2 text-text-secondary">{account.status}</td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-text-placeholder">暂无邮箱账号</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
