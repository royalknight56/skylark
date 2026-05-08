/**
 * 个人名片弹窗
 * 支持查看/编辑个人信息、设置状态、分享名片
 * @author skylark
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X, Pencil, Share2, Copy, Check, Camera,
  Smile, Briefcase, Building2, Mail, Smartphone,
  Link2, QrCode,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useAuth } from "@/lib/auth-context";
import { useOrg } from "@/lib/org-context";
import type { User, OrgMember } from "@/lib/types";

/* 预设状态选项 */
const STATUS_PRESETS = [
  { emoji: "🔴", text: "请勿打扰", status: "busy" as const },
  { emoji: "📅", text: "会议中", status: "busy" as const },
  { emoji: "☕", text: "休息中", status: "away" as const },
  { emoji: "🏠", text: "远程办公", status: "online" as const },
  { emoji: "🏖️", text: "度假中", status: "away" as const },
  { emoji: "🚗", text: "通勤中", status: "away" as const },
];

/* 状态颜色映射 */
const statusDot: Record<string, string> = {
  online: "bg-green-400",
  busy: "bg-red-400",
  away: "bg-yellow-400",
  offline: "bg-gray-400",
};

const statusLabel: Record<string, string> = {
  online: "在线",
  busy: "忙碌",
  away: "离开",
  offline: "离线",
};

interface ProfilePopupProps {
  onClose: () => void;
}

type Tab = "card" | "edit" | "status" | "share";

export default function ProfilePopup({ onClose }: ProfilePopupProps) {
  const { user, refreshUser } = useAuth();
  const { currentOrg } = useOrg();

  const [tab, setTab] = useState<Tab>("card");
  const [memberInfo, setMemberInfo] = useState<(OrgMember & { user: User }) | null>(null);

  /* 编辑表单 */
  const [editName, setEditName] = useState(user?.name || "");
  const [editSignature, setEditSignature] = useState(user?.signature || "");
  const [saving, setSaving] = useState(false);

  /* 状态表单 */
  const [statusEmoji, setStatusEmoji] = useState(user?.status_emoji || "");
  const [statusText, setStatusText] = useState(user?.status_text || "");
  const [statusValue, setStatusValue] = useState<string>(user?.status || "online");

  /* 分享 */
  const [copied, setCopied] = useState(false);

  const popupRef = useRef<HTMLDivElement>(null);

  /* 外部点击关闭 */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  /* 获取企业成员信息 */
  useEffect(() => {
    if (!currentOrg || !user) return;
    fetch(`/api/orgs/${currentOrg.id}/members`)
      .then((r) => r.json())
      .then((json: unknown) => {
        const result = json as { success: boolean; data?: (OrgMember & { user: User })[] };
        if (result.success && result.data) {
          const me = result.data.find((m) => m.user_id === user.id);
          if (me) setMemberInfo(me);
        }
      })
      .catch(() => {});
  }, [currentOrg, user]);

  /* 保存个人信息 */
  const handleSaveProfile = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, signature: editSignature }),
      });
      const json = (await res.json()) as { success: boolean };
      if (json.success) {
        await refreshUser();
        setTab("card");
      }
    } finally {
      setSaving(false);
    }
  }, [editName, editSignature, refreshUser]);

  /* 保存状态 */
  const handleSaveStatus = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusValue,
          status_text: statusText || null,
          status_emoji: statusEmoji || null,
        }),
      });
      const json = (await res.json()) as { success: boolean };
      if (json.success) {
        await refreshUser();
        setTab("card");
      }
    } finally {
      setSaving(false);
    }
  }, [statusValue, statusText, statusEmoji, refreshUser]);

  /* 清除状态 */
  const handleClearStatus = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "online",
          status_text: null,
          status_emoji: null,
        }),
      });
      const json = (await res.json()) as { success: boolean };
      if (json.success) {
        await refreshUser();
        setStatusEmoji("");
        setStatusText("");
        setStatusValue("online");
        setTab("card");
      }
    } finally {
      setSaving(false);
    }
  }, [refreshUser]);

  /* 复制分享链接 */
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/profile/${user?.id}`
    : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-200 flex items-start sm:items-center justify-center bg-black/30 overflow-y-auto px-4 py-4">
      <div
        ref={popupRef}
        className="w-full max-w-105 max-h-[calc(100dvh-2rem)] bg-panel-bg rounded-xl shadow-2xl overflow-y-auto animate-in fade-in zoom-in-95"
      >
        {/* 头部渐变背景 */}
        <div className="h-24 bg-linear-to-br from-primary via-blue-400 to-cyan-300 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center transition-colors"
          >
            <X size={14} className="text-white" />
          </button>
        </div>

        {/* 名片视图 */}
        {tab === "card" && (
          <div className="px-6 pb-5 -mt-10">
            {/* 头像 + 状态 */}
            <div className="relative inline-block">
              <Avatar
                name={user.name}
                avatarUrl={user.avatar_url}
                size="lg"
                className="w-20! h-20! text-2xl! border-4 border-panel-bg shadow-md"
              />
              <span
                className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-[3px] border-panel-bg ${statusDot[user.status] || "bg-gray-400"}`}
              />
            </div>

            {/* 名字 + 状态文本 */}
            <div className="mt-2">
              <h3 className="text-xl font-bold text-text-primary">{user.name}</h3>
              {/* 自定义状态显示 */}
              {(user.status_emoji || user.status_text) && (
                <p className="text-sm text-text-secondary mt-0.5">
                  {user.status_emoji && <span className="mr-1">{user.status_emoji}</span>}
                  {user.status_text || statusLabel[user.status]}
                </p>
              )}
              {!(user.status_emoji || user.status_text) && (
                <p className="text-sm text-text-placeholder mt-0.5">
                  {statusLabel[user.status] || "在线"}
                </p>
              )}
            </div>

            {/* 个性签名 */}
            {user.signature ? (
              <p className="mt-2 text-sm text-text-secondary italic bg-list-hover rounded-lg px-3 py-2">
                &ldquo;{user.signature}&rdquo;
              </p>
            ) : (
              <button
                onClick={() => setTab("edit")}
                className="mt-2 text-sm text-text-placeholder hover:text-primary transition-colors"
              >
                点击添加个性签名...
              </button>
            )}

            {/* 企业信息摘要 */}
            {memberInfo && (memberInfo.title || memberInfo.department) && (
              <div className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
                {memberInfo.title && (
                  <span className="flex items-center gap-1">
                    <Briefcase size={13} className="text-text-placeholder" />
                    {memberInfo.title}
                  </span>
                )}
                {memberInfo.title && memberInfo.department && <span>·</span>}
                {memberInfo.department && (
                  <span className="flex items-center gap-1">
                    <Building2 size={13} className="text-text-placeholder" />
                    {memberInfo.department}
                  </span>
                )}
              </div>
            )}

            {/* 联系方式 */}
            <div className="mt-3 space-y-1">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Mail size={14} className="text-text-placeholder" />
                <span>{user.email}</span>
              </div>
              {user.login_phone && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Smartphone size={14} className="text-text-placeholder" />
                  <span>{user.login_phone}</span>
                </div>
              )}
              {currentOrg && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Building2 size={14} className="text-text-placeholder" />
                  <span>{currentOrg.name}</span>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="mt-4 pt-3 border-t border-panel-border flex gap-2">
              <button
                onClick={() => {
                  setEditName(user.name);
                  setEditSignature(user.signature || "");
                  setTab("edit");
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-list-hover hover:bg-primary/10 text-sm text-text-secondary hover:text-primary transition-colors"
              >
                <Pencil size={14} />
                编辑资料
              </button>
              <button
                onClick={() => {
                  setStatusEmoji(user.status_emoji || "");
                  setStatusText(user.status_text || "");
                  setStatusValue(user.status || "online");
                  setTab("status");
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-list-hover hover:bg-primary/10 text-sm text-text-secondary hover:text-primary transition-colors"
              >
                <Smile size={14} />
                设置状态
              </button>
              <button
                onClick={() => setTab("share")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-list-hover hover:bg-primary/10 text-sm text-text-secondary hover:text-primary transition-colors"
              >
                <Share2 size={14} />
                分享名片
              </button>
            </div>
          </div>
        )}

        {/* 编辑资料视图 */}
        {tab === "edit" && (
          <div className="px-6 pb-5 -mt-10">
            {/* 头像编辑 */}
            <div className="relative inline-block group cursor-pointer">
              <Avatar
                name={user.name}
                avatarUrl={user.avatar_url}
                size="lg"
                className="w-20! h-20! text-2xl! border-4 border-panel-bg shadow-md"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={20} className="text-white" />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {/* 名字 */}
              <div>
                <label className="block text-xs font-medium text-text-placeholder mb-1">名字</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-panel-border bg-bg-page text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="输入你的名字"
                />
              </div>

              {/* 个性签名 */}
              <div>
                <label className="block text-xs font-medium text-text-placeholder mb-1">个性签名</label>
                <textarea
                  value={editSignature}
                  onChange={(e) => setEditSignature(e.target.value)}
                  rows={2}
                  maxLength={100}
                  className="w-full px-3 py-2 rounded-lg border border-panel-border bg-bg-page text-sm text-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="输入你的个性签名..."
                />
                <p className="text-right text-xs text-text-placeholder mt-0.5">
                  {editSignature.length}/100
                </p>
              </div>

              {/* 邮箱（只读） */}
              <div>
                <label className="block text-xs font-medium text-text-placeholder mb-1">邮箱</label>
                <input
                  value={user.email}
                  readOnly
                  className="w-full px-3 py-2 rounded-lg border border-panel-border bg-list-hover text-sm text-text-secondary cursor-not-allowed"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setTab("card")}
                className="flex-1 py-2 rounded-lg border border-panel-border text-sm text-text-secondary hover:bg-list-hover transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={saving || !editName.trim()}
                className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        )}

        {/* 设置状态视图 */}
        {tab === "status" && (
          <div className="px-6 pt-5 pb-5">
            <h4 className="text-base font-semibold text-text-primary mb-3">设置个人状态</h4>

            {/* 自定义状态输入 */}
            <div className="flex items-center gap-2 mb-3">
              <input
                value={statusEmoji}
                onChange={(e) => setStatusEmoji(e.target.value)}
                className="w-12 text-center px-1 py-2 rounded-lg border border-panel-border bg-bg-page text-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="😀"
                maxLength={2}
              />
              <input
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-panel-border bg-bg-page text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="你在做什么？"
                maxLength={50}
              />
            </div>

            {/* 在线状态选择 */}
            <div className="mb-3">
              <p className="text-xs font-medium text-text-placeholder mb-1.5">在线状态</p>
              <div className="flex gap-2">
                {(["online", "busy", "away"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusValue(s)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm transition-colors
                      ${statusValue === s
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-panel-border text-text-secondary hover:bg-list-hover"
                      }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${statusDot[s]}`} />
                    {statusLabel[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* 快捷预设 */}
            <p className="text-xs font-medium text-text-placeholder mb-1.5">快速选择</p>
            <div className="grid grid-cols-2 gap-1.5 mb-4">
              {STATUS_PRESETS.map((preset) => (
                <button
                  key={preset.text}
                  onClick={() => {
                    setStatusEmoji(preset.emoji);
                    setStatusText(preset.text);
                    setStatusValue(preset.status);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors
                    ${statusEmoji === preset.emoji && statusText === preset.text
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-panel-border text-text-secondary hover:bg-list-hover"
                    }`}
                >
                  <span>{preset.emoji}</span>
                  <span>{preset.text}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setTab("card")}
                className="flex-1 py-2 rounded-lg border border-panel-border text-sm text-text-secondary hover:bg-list-hover transition-colors"
              >
                取消
              </button>
              {(user.status_emoji || user.status_text) && (
                <button
                  onClick={handleClearStatus}
                  disabled={saving}
                  className="py-2 px-4 rounded-lg border border-red-200 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  清除
                </button>
              )}
              <button
                onClick={handleSaveStatus}
                disabled={saving}
                className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? "保存中..." : "确定"}
              </button>
            </div>
          </div>
        )}

        {/* 分享名片视图 */}
        {tab === "share" && (
          <div className="px-6 pb-5 -mt-4">
            <h4 className="text-base font-semibold text-text-primary mb-4">分享个人名片</h4>

            {/* 名片预览卡 */}
            <div className="border border-panel-border rounded-xl p-4 mb-4 bg-bg-page">
              <div className="flex items-center gap-3">
                <Avatar name={user.name} avatarUrl={user.avatar_url} size="lg" />
                <div className="flex-1 min-w-0">
                  <h5 className="text-base font-bold text-text-primary truncate">{user.name}</h5>
                  {memberInfo?.title && (
                    <p className="text-sm text-text-secondary truncate">{memberInfo.title}</p>
                  )}
                  {currentOrg && (
                    <p className="text-xs text-text-placeholder truncate">{currentOrg.name}</p>
                  )}
                </div>
              </div>
              {user.signature && (
                <p className="mt-2 text-xs text-text-secondary italic">&ldquo;{user.signature}&rdquo;</p>
              )}
            </div>

            {/* 二维码区域 */}
            <div className="flex flex-col items-center py-4 bg-list-hover rounded-xl mb-4">
              <div className="w-40 h-40 bg-white rounded-xl flex items-center justify-center border border-panel-border mb-3">
                {/* 简化的文字型二维码占位 */}
                <div className="text-center">
                  <QrCode size={80} className="text-text-placeholder mx-auto mb-1" />
                  <p className="text-[10px] text-text-placeholder">扫码查看名片</p>
                </div>
              </div>
              <p className="text-xs text-text-placeholder">
                扫描二维码或使用链接分享你的名片
              </p>
            </div>

            {/* 分享链接 */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-bg-page border border-panel-border rounded-lg">
                <Link2 size={14} className="text-text-placeholder shrink-0" />
                <span className="text-sm text-text-secondary truncate">{shareUrl}</span>
              </div>
              <button
                onClick={handleCopyLink}
                className={`shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1
                  ${copied
                    ? "bg-green-50 text-green-600 border border-green-200"
                    : "bg-primary text-white hover:bg-primary/90"
                  }`}
              >
                {copied ? <><Check size={14} /> 已复制</> : <><Copy size={14} /> 复制</>}
              </button>
            </div>

            <button
              onClick={() => setTab("card")}
              className="w-full py-2 rounded-lg border border-panel-border text-sm text-text-secondary hover:bg-list-hover transition-colors"
            >
              返回
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
