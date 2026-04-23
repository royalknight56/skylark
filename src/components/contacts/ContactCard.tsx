/**
 * 联系人详情卡片组件
 * @author skylark
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Phone, Video, Mail, MoreHorizontal, Loader2 } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useOrg } from "@/lib/org-context";
import type { User } from "@/lib/types";

interface ContactCardProps {
  user: User;
}

const statusLabel: Record<string, string> = {
  online: "在线",
  offline: "离线",
  busy: "忙碌",
  away: "离开",
};

const statusColor: Record<string, string> = {
  online: "text-success",
  offline: "text-gray-400",
  busy: "text-danger",
  away: "text-warning",
};

export default function ContactCard({ user }: ContactCardProps) {
  const router = useRouter();
  const { currentOrg } = useOrg();
  const [sending, setSending] = useState(false);

  /** 查找或创建私聊会话并跳转 */
  const handleSendMessage = async () => {
    if (!currentOrg || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/conversations/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: currentOrg.id, target_user_id: user.id }),
      });
      const json = (await res.json()) as { success: boolean; data?: { id: string } };
      if (json.success && json.data) {
        router.push(`/messages/${json.data.id}`);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex-1 flex items-start justify-center bg-bg-page p-8">
      <div className="w-full max-w-md bg-panel-bg rounded-xl shadow-sm overflow-hidden">
        {/* 头部背景 */}
        <div className="h-24 bg-gradient-to-r from-primary to-blue-400" />

        {/* 用户信息 */}
        <div className="px-6 pb-6 -mt-10">
          <Avatar name={user.name} avatarUrl={user.avatar_url} size="lg" className="!w-20 !h-20 !text-2xl border-4 border-panel-bg" />

          <div className="mt-3">
            <h3 className="text-xl font-semibold text-text-primary">{user.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-sm ${statusColor[user.status] || "text-gray-400"}`}>
                {statusLabel[user.status] || "离线"}
              </span>
            </div>
          </div>

          {/* 联系方式 */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <Mail size={16} className="text-text-secondary" />
              <span className="text-text-primary">{user.email}</span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleSendMessage}
              disabled={sending}
              className="flex-1 h-9 rounded-lg bg-primary text-white text-sm font-medium
                flex items-center justify-center gap-2 hover:bg-primary-hover transition-colors disabled:opacity-70"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
              发消息
            </button>
            <button
              className="w-9 h-9 rounded-lg border border-panel-border flex items-center justify-center
                text-text-secondary hover:bg-list-hover transition-colors"
            >
              <Phone size={16} />
            </button>
            <button
              className="w-9 h-9 rounded-lg border border-panel-border flex items-center justify-center
                text-text-secondary hover:bg-list-hover transition-colors"
            >
              <Video size={16} />
            </button>
            <button
              className="w-9 h-9 rounded-lg border border-panel-border flex items-center justify-center
                text-text-secondary hover:bg-list-hover transition-colors"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
