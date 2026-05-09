/**
 * 个人设置页面
 * @author skylark
 */

"use client";

import { useEffect, useState } from "react";
import {
  Briefcase,
  Check,
  Copy,
  Gift,
  Loader2,
  LogOut,
  Mail,
  Save,
  Share2,
  Smile,
  User as UserIcon,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useAuth } from "@/lib/auth-context";

const STATUS_PRESETS = [
  { emoji: "🔴", text: "请勿打扰", status: "busy" as const },
  { emoji: "📅", text: "会议中", status: "busy" as const },
  { emoji: "☕", text: "休息中", status: "away" as const },
  { emoji: "🏠", text: "远程办公", status: "online" as const },
  { emoji: "🏖️", text: "度假中", status: "away" as const },
  { emoji: "🚗", text: "通勤中", status: "away" as const },
];

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

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [signature, setSignature] = useState(user?.signature || "");
  const [statusEmoji, setStatusEmoji] = useState(user?.status_emoji || "");
  const [statusText, setStatusText] = useState(user?.status_text || "");
  const [statusValue, setStatusValue] = useState(user?.status || "online");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [shareOrigin, setShareOrigin] = useState("");
  const [activityLinkCopied, setActivityLinkCopied] = useState(false);
  const [activityTextCopied, setActivityTextCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setSignature(user.signature || "");
    setStatusEmoji(user.status_emoji || "");
    setStatusText(user.status_text || "");
    setStatusValue(user.status || "online");
  }, [user]);

  useEffect(() => {
    setShareOrigin(window.location.origin);
  }, []);

  /** 保存个人信息 */
  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          signature: signature.trim() || null,
          status: statusValue,
          status_text: statusText.trim() || null,
          status_emoji: statusEmoji.trim() || null,
        }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!json.success) {
        setError(json.error || "保存失败，请稍后重试");
        return;
      }
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const activityLink = shareOrigin
    ? `${shareOrigin}/profile/${user.id}?ref=${encodeURIComponent(user.id)}&utm_source=share_activity`
    : "";
  const activityText = [
    "我在用 Skylark 做团队协作，个人名片、消息、文档和日程都在一个工作台里。",
    `这是我的名片入口：${activityLink}`,
  ].join("\n");

  const copyActivityLink = async () => {
    if (!activityLink) return;
    await navigator.clipboard.writeText(activityLink);
    setActivityLinkCopied(true);
    setTimeout(() => setActivityLinkCopied(false), 2000);
  };

  const copyActivityText = async () => {
    if (!activityText) return;
    await navigator.clipboard.writeText(activityText);
    setActivityTextCopied(true);
    setTimeout(() => setActivityTextCopied(false), 2000);
  };

  return (
    <div className="flex-1 bg-bg-page overflow-y-auto">
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-text-primary">个人设置</h1>
          <p className="mt-1 text-sm text-text-placeholder">这些资料会同步展示在个人名片中</p>
        </div>

        <div className="bg-panel-bg border border-panel-border rounded-xl overflow-hidden">
          <div className="h-24 bg-linear-to-br from-primary via-blue-400 to-cyan-300" />
          <div className="px-5 sm:px-6 pb-6 -mt-10">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
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
                <div className="mt-2">
                  <p className="text-xl font-bold text-text-primary">{user.name}</p>
                  <p className="text-sm text-text-secondary">
                    {user.status_emoji && <span className="mr-1">{user.status_emoji}</span>}
                    {user.status_text || statusLabel[user.status] || "在线"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Mail size={14} className="text-text-placeholder" />
                <span className="break-all">{user.email}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_18rem]">
          <div className="bg-panel-bg border border-panel-border rounded-xl p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <UserIcon size={16} className="text-primary" />
              基本资料
            </div>

            <div>
              <label className="block text-xs font-medium text-text-placeholder mb-1.5">名字</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-bg-page border border-panel-border rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-primary/30 text-text-primary"
                placeholder="输入你的名字"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-placeholder mb-1.5">个性签名</label>
              <textarea
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                rows={3}
                maxLength={100}
                className="w-full px-3 py-2.5 text-sm bg-bg-page border border-panel-border rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-primary/30 text-text-primary resize-none"
                placeholder="输入你的个性签名..."
              />
              <p className="mt-1 text-right text-xs text-text-placeholder">{signature.length}/100</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-placeholder mb-1.5">邮箱</label>
              <input
                value={user.email}
                readOnly
                className="w-full px-3 py-2.5 text-sm bg-list-hover border border-panel-border rounded-lg
                  text-text-secondary cursor-not-allowed"
              />
            </div>
          </div>

          <div className="bg-panel-bg border border-panel-border rounded-xl p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Smile size={16} className="text-primary" />
              个人状态
            </div>

            <div className="flex items-center gap-2">
              <input
                value={statusEmoji}
                onChange={(e) => setStatusEmoji(e.target.value)}
                className="w-12 text-center px-1 py-2.5 rounded-lg border border-panel-border bg-bg-page text-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="😀"
                maxLength={2}
              />
              <input
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                className="min-w-0 flex-1 px-3 py-2.5 rounded-lg border border-panel-border bg-bg-page text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="你在做什么？"
                maxLength={50}
              />
            </div>

            <div>
              <p className="text-xs font-medium text-text-placeholder mb-1.5">在线状态</p>
              <div className="grid grid-cols-3 gap-2">
                {(["online", "busy", "away"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusValue(status)}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm transition-colors
                      ${statusValue === status
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-panel-border text-text-secondary hover:bg-list-hover"
                      }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${statusDot[status]}`} />
                    {statusLabel[status]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-text-placeholder mb-1.5">快速选择</p>
              <div className="grid grid-cols-2 gap-1.5">
                {STATUS_PRESETS.map((preset) => (
                  <button
                    key={preset.text}
                    type="button"
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
                    <span className="truncate">{preset.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 bg-panel-bg border border-panel-border rounded-xl p-5 sm:p-6">
          {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Briefcase size={16} className="text-text-placeholder" />
              保存后会同步更新侧边栏头像名片和公开名片页
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {(statusEmoji || statusText || statusValue !== "online") && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusEmoji("");
                    setStatusText("");
                    setStatusValue("online");
                  }}
                  className="px-4 py-2.5 rounded-lg border border-panel-border text-sm text-text-secondary hover:bg-list-hover transition-colors"
                >
                  清除状态
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg
                  hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saved ? "已保存" : "保存"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 bg-panel-bg border border-panel-border rounded-xl overflow-hidden">
          <div className="p-5 sm:p-6 bg-linear-to-br from-primary/10 via-bg-page to-cyan-50 border-b border-panel-border">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Gift size={16} />
                  分享裂变活动
                </div>
                <h2 className="mt-2 text-lg font-bold text-text-primary">邀请同事从你的名片进入 Skylark</h2>
                <p className="mt-1 text-sm text-text-secondary leading-6">
                  分享专属链接，好友打开后会先看到你的公开名片，再了解 Skylark。
                </p>
              </div>
              <div className="shrink-0 rounded-xl bg-panel-bg border border-panel-border px-4 py-3 text-center">
                <p className="text-2xl font-bold text-primary">1</p>
                <p className="text-xs text-text-placeholder">专属入口</p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-panel-border bg-bg-page px-3 py-3">
                <p className="text-xs text-text-placeholder">分享入口</p>
                <p className="mt-1 text-sm font-medium text-text-primary">个人名片页</p>
              </div>
              <div className="rounded-lg border border-panel-border bg-bg-page px-3 py-3">
                <p className="text-xs text-text-placeholder">推荐标识</p>
                <p className="mt-1 text-sm font-medium text-text-primary truncate">{user.id}</p>
              </div>
              <div className="rounded-lg border border-panel-border bg-bg-page px-3 py-3">
                <p className="text-xs text-text-placeholder">活动状态</p>
                <p className="mt-1 text-sm font-medium text-success">可分享</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-placeholder mb-1.5">专属分享链接</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="min-w-0 flex-1 flex items-center gap-2 px-3 py-2.5 bg-bg-page border border-panel-border rounded-lg">
                  <Share2 size={14} className="text-text-placeholder shrink-0" />
                  <span className="min-w-0 truncate text-sm text-text-secondary">{activityLink}</span>
                </div>
                <button
                  type="button"
                  onClick={copyActivityLink}
                  className={`shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5
                    ${activityLinkCopied
                      ? "bg-green-50 text-green-600 border border-green-200"
                      : "bg-primary text-white hover:bg-primary/90"
                    }`}
                >
                  {activityLinkCopied ? <Check size={14} /> : <Copy size={14} />}
                  {activityLinkCopied ? "已复制" : "复制链接"}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg bg-list-hover px-4 py-3">
              <p className="text-sm text-text-secondary leading-6">
                一键复制邀请文案，适合发送到群聊、朋友圈或邮件。
              </p>
              <button
                type="button"
                onClick={copyActivityText}
                className="shrink-0 px-4 py-2 rounded-lg border border-panel-border bg-panel-bg text-sm text-text-primary hover:bg-bg-page transition-colors flex items-center justify-center gap-1.5"
              >
                {activityTextCopied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                {activityTextCopied ? "文案已复制" : "复制邀请文案"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 bg-panel-bg border border-panel-border rounded-xl p-5 sm:p-6">
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            退出登录
          </button>
        </div>
      </div>
    </div>
  );
}
