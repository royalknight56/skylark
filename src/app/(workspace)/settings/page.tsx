/**
 * 个人设置页面
 * @author skylark
 */

"use client";

import { useState } from "react";
import { Loader2, Save, LogOut } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useAuth } from "@/lib/auth-context";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  /** 保存个人信息 */
  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex-1 bg-bg-page overflow-y-auto">
      <div className="max-w-xl mx-auto py-10 px-6">
        <h1 className="text-xl font-bold text-text-primary mb-8">个人设置</h1>

        {/* 头像区域 */}
        <div className="flex items-center gap-4 mb-8">
          <Avatar name={user.name} avatarUrl={user.avatar_url} size="lg" className="w-16! h-16! text-xl!" />
          <div>
            <p className="text-base font-semibold text-text-primary">{user.name}</p>
            <p className="text-sm text-text-placeholder">{user.email}</p>
          </div>
        </div>

        {/* 姓名 */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">姓名</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-panel-bg border border-panel-border rounded-lg
                focus:outline-none focus:ring-2 focus:ring-primary/30 text-text-primary"
            />
          </div>

          {/* 邮箱（只读） */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">邮箱</label>
            <input
              value={user.email}
              readOnly
              className="w-full px-3 py-2.5 text-sm bg-bg-page border border-panel-border rounded-lg
                text-text-placeholder cursor-not-allowed"
            />
          </div>

          {/* 保存 */}
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg
              hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saved ? "已保存" : "保存"}
          </button>
        </div>

        {/* 退出登录 */}
        <div className="mt-12 pt-6 border-t border-panel-border">
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
