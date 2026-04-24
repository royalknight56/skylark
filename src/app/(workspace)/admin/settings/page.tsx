/**
 * 管理后台 - 企业信息管理
 * 参照飞书企业信息管理：头像、名称、行业、描述、联系人、地址、邀请码等
 * @author skylark
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Loader2, Save, Copy, CheckCircle, RefreshCw, Camera,
  Building2, Globe, MapPin, Phone, Mail, User2, Hash,
  Pencil, X, Briefcase, Link, Info,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useOrg } from "@/lib/org-context";
import type { Organization } from "@/lib/types";

/** 行业选项 */
const INDUSTRY_OPTIONS = [
  "互联网/IT",
  "金融/银行",
  "教育/培训",
  "医疗/健康",
  "制造业",
  "零售/电商",
  "房地产/建筑",
  "物流/运输",
  "咨询/法律",
  "媒体/文化",
  "政府/公共事业",
  "农业/环保",
  "其他",
];

export default function AdminSettings() {
  const { currentOrg, refreshOrgs } = useOrg();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // 编辑模式
  const [editing, setEditing] = useState(false);

  // 表单字段
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);

  // 头像上传
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  /** 加载企业信息 */
  const loadOrg = useCallback(async () => {
    if (!currentOrg) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/settings?org_id=${currentOrg.id}`);
      const json = (await res.json()) as { success: boolean; data?: Organization };
      if (json.success && json.data) {
        setOrg(json.data);
        populateForm(json.data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [currentOrg]);

  const populateForm = (o: Organization) => {
    setName(o.name || "");
    setDescription(o.description || "");
    setIndustry(o.industry || "");
    setAddress(o.address || "");
    setWebsite(o.website || "");
    setContactName(o.contact_name || "");
    setContactEmail(o.contact_email || "");
    setContactPhone(o.contact_phone || "");
    setRequireApproval(!!o.require_approval);
  };

  useEffect(() => { loadOrg(); }, [loadOrg]);

  /** 上传企业头像 */
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentOrg) return;

    // 限制图片类型和大小
    if (!file.type.startsWith("image/")) {
      alert("请上传图片文件");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("图片大小不能超过 5MB");
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadJson = (await uploadRes.json()) as {
        success: boolean;
        data?: { url: string };
      };

      if (uploadJson.success && uploadJson.data) {
        // 更新企业 logo
        const res = await fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            org_id: currentOrg.id,
            logo_url: uploadJson.data.url,
          }),
        });
        const json = (await res.json()) as { success: boolean; data?: Organization };
        if (json.success && json.data) {
          setOrg(json.data);
          refreshOrgs();
        }
      }
    } catch {
      alert("上传失败，请重试");
    }
    setUploadingLogo(false);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  /** 保存企业信息 */
  const handleSave = async () => {
    if (!currentOrg || !name.trim()) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: currentOrg.id,
          name: name.trim(),
          description: description.trim() || null,
          industry: industry || null,
          address: address.trim() || null,
          website: website.trim() || null,
          contact_name: contactName.trim() || null,
          contact_email: contactEmail.trim() || null,
          contact_phone: contactPhone.trim() || null,
          require_approval: requireApproval,
        }),
      });
      const json = (await res.json()) as { success: boolean; data?: Organization };
      if (json.success && json.data) {
        setOrg(json.data);
        populateForm(json.data);
        setEditing(false);
        setSaveSuccess(true);
        refreshOrgs();
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch {
      alert("保存失败，请重试");
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
    <div className="max-w-3xl">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Building2 size={22} className="text-primary" />
            企业信息管理
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            管理企业基本信息、联系方式和邀请设置
          </p>
        </div>
        {!editing ? (
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium
              hover:bg-primary/90 transition-colors">
            <Pencil size={14} /> 编辑信息
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => { setEditing(false); if (org) populateForm(org); }}
              className="px-4 py-2 text-sm text-text-secondary border border-panel-border rounded-lg
                hover:bg-list-hover transition-colors">
              取消
            </button>
            <button onClick={handleSave} disabled={saving || !name.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium
                hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              保存
            </button>
          </div>
        )}
      </div>

      {/* 保存成功提示 */}
      {saveSuccess && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <CheckCircle size={16} /> 企业信息已保存
        </div>
      )}

      <div className="space-y-6">
        {/* ═══ 企业头像 & 基本信息 ═══ */}
        <div className="bg-panel-bg rounded-xl border border-panel-border overflow-hidden">
          <div className="px-6 py-4 border-b border-panel-border">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Info size={15} className="text-primary" /> 基本信息
            </h2>
          </div>

          <div className="px-6 py-6">
            {/* 头像区域 */}
            <div className="flex items-center gap-6 mb-8">
              <div className="relative group">
                {org?.logo_url ? (
                  <img src={org.logo_url} alt="企业头像"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-panel-border" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 border-2 border-panel-border flex items-center justify-center">
                    <Building2 size={32} className="text-primary" />
                  </div>
                )}
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/40 transition-colors
                    flex items-center justify-center opacity-0 group-hover:opacity-100">
                  {uploadingLogo
                    ? <Loader2 size={20} className="text-white animate-spin" />
                    : <Camera size={20} className="text-white" />
                  }
                </button>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                  onChange={handleLogoUpload} />
              </div>
              <div>
                <p className="text-base font-semibold text-text-primary">{org?.name}</p>
                <p className="text-xs text-text-placeholder mt-1">
                  点击头像上传企业标志，建议尺寸 200×200px
                </p>
              </div>
            </div>

            {/* 基本字段 */}
            <div className="space-y-5">
              {/* 企业名称 */}
              <FieldRow icon={<Building2 size={15} />} label="企业名称" required>
                {editing ? (
                  <input value={name} onChange={(e) => setName(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-lg border border-panel-border text-sm bg-bg-page
                      text-text-primary outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="输入企业名称" />
                ) : (
                  <span className="text-sm text-text-primary">{org?.name || "—"}</span>
                )}
              </FieldRow>

              {/* 企业描述 */}
              <FieldRow icon={<Briefcase size={15} />} label="企业描述">
                {editing ? (
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="flex-1 px-3 py-2 rounded-lg border border-panel-border text-sm bg-bg-page
                      text-text-primary outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    placeholder="简要描述企业的业务和文化" />
                ) : (
                  <span className="text-sm text-text-primary">{org?.description || "未设置"}</span>
                )}
              </FieldRow>

              {/* 所属行业 */}
              <FieldRow icon={<Hash size={15} />} label="所属行业">
                {editing ? (
                  <select value={industry} onChange={(e) => setIndustry(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-lg border border-panel-border text-sm bg-bg-page
                      text-text-primary outline-none appearance-none cursor-pointer">
                    <option value="">请选择行业</option>
                    {INDUSTRY_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                ) : (
                  <span className="text-sm text-text-primary">{org?.industry || "未设置"}</span>
                )}
              </FieldRow>

              {/* 企业地址 */}
              <FieldRow icon={<MapPin size={15} />} label="企业地址">
                {editing ? (
                  <input value={address} onChange={(e) => setAddress(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-lg border border-panel-border text-sm bg-bg-page
                      text-text-primary outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="输入企业办公地址" />
                ) : (
                  <span className="text-sm text-text-primary">{org?.address || "未设置"}</span>
                )}
              </FieldRow>

              {/* 企业官网 */}
              <FieldRow icon={<Globe size={15} />} label="企业官网">
                {editing ? (
                  <input value={website} onChange={(e) => setWebsite(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-lg border border-panel-border text-sm bg-bg-page
                      text-text-primary outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="https://example.com" />
                ) : (
                  <span className="text-sm text-text-primary">
                    {org?.website ? (
                      <a href={org.website} target="_blank" rel="noreferrer"
                        className="text-primary hover:underline">{org.website}</a>
                    ) : "未设置"}
                  </span>
                )}
              </FieldRow>

              {/* 企业编号（只读） */}
              <FieldRow icon={<Hash size={15} />} label="企业编号">
                <span className="text-sm text-text-placeholder font-mono">{org?.id || "—"}</span>
              </FieldRow>

              {/* 创建时间（只读） */}
              <FieldRow icon={<Hash size={15} />} label="创建时间">
                <span className="text-sm text-text-placeholder">
                  {org?.created_at ? new Date(org.created_at).toLocaleDateString("zh-CN", {
                    year: "numeric", month: "long", day: "numeric",
                  }) : "—"}
                </span>
              </FieldRow>
            </div>
          </div>
        </div>

        {/* ═══ 联系人信息 ═══ */}
        <div className="bg-panel-bg rounded-xl border border-panel-border overflow-hidden">
          <div className="px-6 py-4 border-b border-panel-border">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <User2 size={15} className="text-primary" /> 企业联系人
            </h2>
          </div>
          <div className="px-6 py-6 space-y-5">
            <FieldRow icon={<User2 size={15} />} label="联系人姓名">
              {editing ? (
                <input value={contactName} onChange={(e) => setContactName(e.target.value)}
                  className="flex-1 h-9 px-3 rounded-lg border border-panel-border text-sm bg-bg-page
                    text-text-primary outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="企业联系人姓名" />
              ) : (
                <span className="text-sm text-text-primary">{org?.contact_name || "未设置"}</span>
              )}
            </FieldRow>

            <FieldRow icon={<Mail size={15} />} label="联系邮箱">
              {editing ? (
                <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                  type="email"
                  className="flex-1 h-9 px-3 rounded-lg border border-panel-border text-sm bg-bg-page
                    text-text-primary outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="contact@company.com" />
              ) : (
                <span className="text-sm text-text-primary">{org?.contact_email || "未设置"}</span>
              )}
            </FieldRow>

            <FieldRow icon={<Phone size={15} />} label="联系电话">
              {editing ? (
                <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
                  type="tel"
                  className="flex-1 h-9 px-3 rounded-lg border border-panel-border text-sm bg-bg-page
                    text-text-primary outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="企业联系电话" />
              ) : (
                <span className="text-sm text-text-primary">{org?.contact_phone || "未设置"}</span>
              )}
            </FieldRow>
          </div>
        </div>

        {/* ═══ 邀请设置 ═══ */}
        <div className="bg-panel-bg rounded-xl border border-panel-border overflow-hidden">
          <div className="px-6 py-4 border-b border-panel-border">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Link size={15} className="text-primary" /> 邀请设置
            </h2>
          </div>
          <div className="px-6 py-6 space-y-5">
            {/* 邀请码 */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">企业邀请码</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-2.5 bg-bg-page border border-panel-border rounded-lg
                  text-sm font-mono text-text-primary tracking-wider">
                  {org?.invite_code || "—"}
                </div>
                <button onClick={handleCopy} title="复制邀请码"
                  className="h-10 w-10 rounded-lg border border-panel-border flex items-center justify-center
                    hover:bg-list-hover transition-colors">
                  {copied
                    ? <CheckCircle size={16} className="text-green-500" />
                    : <Copy size={16} className="text-text-secondary" />
                  }
                </button>
                <button onClick={handleRegenerateCode} title="重新生成邀请码"
                  className="h-10 w-10 rounded-lg border border-panel-border flex items-center justify-center
                    hover:bg-list-hover transition-colors">
                  <RefreshCw size={16} className="text-text-secondary" />
                </button>
              </div>
              <p className="text-xs text-text-placeholder mt-1.5">
                分享邀请码给他人即可加入企业。重新生成后旧邀请码失效。
              </p>
            </div>

            {/* 审批开关 */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-text-primary">加入需审批</p>
                <p className="text-xs text-text-placeholder mt-0.5">
                  开启后，通过邀请码加入需管理员审批
                </p>
              </div>
              {editing ? (
                <button onClick={() => setRequireApproval(!requireApproval)}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                    requireApproval ? "bg-primary" : "bg-gray-300"
                  }`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    requireApproval ? "translate-x-5.5 left-0" : "left-0.5"
                  }`} />
                </button>
              ) : (
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                  org?.require_approval
                    ? "bg-primary/10 text-primary"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {org?.require_approval ? "已开启" : "未开启"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 底部保存（编辑模式时显示） */}
        {editing && (
          <div className="flex items-center justify-end gap-3 pt-2 pb-4">
            <button onClick={() => { setEditing(false); if (org) populateForm(org); }}
              className="px-5 py-2.5 text-sm text-text-secondary border border-panel-border rounded-lg
                hover:bg-list-hover transition-colors">
              取消
            </button>
            <button onClick={handleSave} disabled={saving || !name.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium
                hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              保存设置
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** 字段行组件 */
function FieldRow({
  icon, label, required, children,
}: {
  icon: React.ReactNode;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex items-center gap-2 w-28 shrink-0 pt-2">
        <span className="text-text-placeholder">{icon}</span>
        <span className="text-xs text-text-secondary">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
