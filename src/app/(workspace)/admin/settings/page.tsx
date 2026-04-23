/**
 * 管理后台 - 企业设置页面
 * 信息编辑 + 邀请码 + 审批开关
 * @author skylark
 */

"use client";

import { useState, useEffect } from "react";
import { Loader2, RefreshCw, Save, Copy, CheckCircle } from "lucide-react";
import { useOrg } from "@/lib/org-context";
import type { Organization } from "@/lib/types";

export default function AdminSettings() {
  const { currentOrg, refreshOrgs } = useOrg();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  /* 表单字段 */
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);

  /** 加载企业信息 */
  useEffect(() => {
    if (!currentOrg) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/admin/settings?org_id=${currentOrg.id}`)
      .then((res) => res.json() as Promise<{ success: boolean; data?: Organization }>)
      .then((json) => {
        if (json.success && json.data) {
          setOrg(json.data);
          setName(json.data.name);
          setDescription(json.data.description || "");
          setRequireApproval(!!json.data.require_approval);
        }
      })
      .finally(() => setLoading(false));
  }, [currentOrg]);

  /** 保存设置 */
  const handleSave = async () => {
    if (!currentOrg) return;
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        org_id: currentOrg.id,
        name: name.trim(),
        description: description.trim(),
        require_approval: requireApproval,
      }),
    });
    const json = (await res.json()) as { success: boolean; data?: Organization };
    if (json.success && json.data) {
      setOrg(json.data);
      refreshOrgs();
    }
    setSaving(false);
  };

  /** 重新生成邀请码 */
  const handleRegenerateCode = async () => {
    if (!currentOrg) return;
    if (!confirm("重新生成邀请码后，旧邀请码将失效。确认？")) return;
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_id: currentOrg.id, regenerate_invite_code: true }),
    });
    const json = (await res.json()) as { success: boolean; data?: Organization };
    if (json.success && json.data) {
      setOrg(json.data);
    }
  };

  /** 复制邀请码 */
  const handleCopy = () => {
    if (org?.invite_code) {
      navigator.clipboard.writeText(org.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold text-text-primary mb-6">企业设置</h1>

      <div className="space-y-6">
        {/* 企业名称 */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">企业名称</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2.5 text-sm bg-panel-bg border border-panel-border rounded-lg
              focus:outline-none focus:ring-2 focus:ring-primary/30 text-text-primary"
          />
        </div>

        {/* 企业描述 */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">企业描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 text-sm bg-panel-bg border border-panel-border rounded-lg
              focus:outline-none focus:ring-2 focus:ring-primary/30 text-text-primary resize-none"
          />
        </div>

        {/* 邀请码 */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">邀请码</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2.5 bg-panel-bg border border-panel-border rounded-lg text-sm font-mono text-text-primary tracking-wider">
              {org?.invite_code || "-"}
            </div>
            <button
              onClick={handleCopy}
              className="p-2.5 rounded-lg border border-panel-border hover:bg-list-hover transition-colors"
              title="复制邀请码"
            >
              {copied ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} className="text-text-secondary" />}
            </button>
            <button
              onClick={handleRegenerateCode}
              className="p-2.5 rounded-lg border border-panel-border hover:bg-list-hover transition-colors"
              title="重新生成"
            >
              <RefreshCw size={16} className="text-text-secondary" />
            </button>
          </div>
          <p className="text-xs text-text-placeholder mt-1.5">将邀请码分享给他人，即可加入企业</p>
        </div>

        {/* 审批开关 */}
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-text-primary">加入需审批</p>
            <p className="text-xs text-text-placeholder mt-0.5">开启后，通过邀请码加入需管理员审批</p>
          </div>
          <button
            onClick={() => setRequireApproval(!requireApproval)}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              requireApproval ? "bg-primary" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                requireApproval ? "translate-x-5.5 left-0" : "left-0.5"
              }`}
            />
          </button>
        </div>

        {/* 保存按钮 */}
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg
            hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          保存设置
        </button>
      </div>
    </div>
  );
}
