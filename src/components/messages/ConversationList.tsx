/**
 * 会话列表组件
 * 展示当前用户的所有会话（单聊/群聊）
 * @author skylark
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Search } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import type { Conversation } from "@/lib/types";

interface ConversationListProps {
  conversations: Conversation[];
}

/** 格式化时间为简短展示 */
function formatTime(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const oneDay = 86400000;

  if (diff < oneDay && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  }
  if (diff < oneDay * 2) return "昨天";
  if (diff < oneDay * 7) {
    const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return days[date.getDay()];
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export default function ConversationList({ conversations }: ConversationListProps) {
  const pathname = usePathname();
  const [searchText, setSearchText] = useState("");

  const filtered = conversations.filter((c) => {
    if (!searchText) return true;
    const name = c.name || "未命名会话";
    return name.toLowerCase().includes(searchText.toLowerCase());
  });

  return (
    <div className="w-72 h-full border-r border-panel-border bg-panel-bg flex flex-col flex-shrink-0">
      {/* 顶部标题栏 */}
      <div className="h-14 px-4 flex items-center justify-between flex-shrink-0 border-b border-panel-border">
        <h2 className="text-base font-semibold text-text-primary">消息</h2>
        <button
          className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary
            hover:bg-list-hover transition-colors"
          title="发起聊天"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* 搜索框 */}
      <div className="px-3 py-2 flex-shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-placeholder" />
          <input
            type="text"
            placeholder="搜索"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full h-8 pl-8 pr-3 rounded-md bg-bg-page border-none outline-none
              text-sm text-text-primary placeholder:text-text-placeholder"
          />
        </div>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((conv) => {
          const isActive = pathname === `/messages/${conv.id}`;
          const displayName = conv.name || "未命名会话";

          return (
            <Link
              key={conv.id}
              href={`/messages/${conv.id}`}
              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors
                ${isActive ? "bg-list-active" : "hover:bg-list-hover"}`}
            >
              <Avatar
                name={displayName}
                avatarUrl={conv.avatar_url}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary truncate">
                    {displayName}
                  </span>
                  <span className="text-xs text-text-placeholder ml-2 flex-shrink-0">
                    {formatTime(conv.last_message_at || conv.updated_at)}
                  </span>
                </div>
                <p className="text-xs text-text-secondary truncate mt-0.5">
                  {conv.last_message || "暂无消息"}
                </p>
              </div>
              {conv.unread_count && conv.unread_count > 0 ? (
                <span className="w-5 h-5 rounded-full bg-danger text-white text-xs flex items-center justify-center flex-shrink-0">
                  {conv.unread_count > 99 ? "99+" : conv.unread_count}
                </span>
              ) : null}
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-12 text-center text-text-placeholder text-sm">
            暂无会话
          </div>
        )}
      </div>
    </div>
  );
}
