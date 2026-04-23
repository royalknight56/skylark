/**
 * 聊天面板主组件
 * 展示消息列表 + 消息输入框
 * @author skylark
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Phone, Video, MoreHorizontal, Users as UsersIcon } from "lucide-react";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import Avatar from "@/components/ui/Avatar";
import type { Message, Conversation } from "@/lib/types";

interface ChatViewProps {
  conversation: Conversation;
  initialMessages: Message[];
  currentUserId: string;
  memberCount?: number;
}

/** 判断是否需要显示时间分割线 */
function shouldShowTimeDivider(current: Message, previous?: Message): boolean {
  if (!previous) return true;
  const diff = new Date(current.created_at).getTime() - new Date(previous.created_at).getTime();
  return diff > 5 * 60 * 1000; // 5分钟间隔
}

/** 格式化分割线时间 */
function formatDividerTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatView({
  conversation,
  initialMessages,
  currentUserId,
  memberCount,
}: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const displayName = conversation.name || "未命名会话";

  /** 滚动到底部 */
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  /** 发送消息 */
  const handleSend = async (content: string, type = "text") => {
    // 乐观更新：先在本地显示
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversation.id,
      sender_id: currentUserId,
      content,
      type: type as Message["type"],
      reply_to: null,
      created_at: new Date().toISOString(),
      updated_at: null,
      sender: {
        id: currentUserId,
        email: "",
        name: "我",
        avatar_url: null,
        status: "online",
        current_org_id: null,
        created_at: "",
      },
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, type }),
      });
      const data = (await res.json()) as { success: boolean; data?: Message };
      if (data.success && data.data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempMsg.id ? data.data! : m))
        );
      }
    } catch {
      // 发送失败保留临时消息
    }
  };

  /** 文件上传 */
  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("conversation_id", conversation.id);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as { success: boolean; data?: { url: string } };
      if (data.success && data.data) {
        const isImage = file.type.startsWith("image/");
        await handleSend(
          isImage ? data.data.url : file.name,
          isImage ? "image" : "file"
        );
      }
    } catch {
      // 上传失败
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-bg-page overflow-hidden">
      {/* 聊天顶栏 */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-panel-border bg-panel-bg flex-shrink-0">
        <div className="flex items-center gap-3">
          <Avatar name={displayName} avatarUrl={conversation.avatar_url} size="sm" />
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{displayName}</h3>
            {conversation.type === "group" && memberCount && (
              <span className="text-xs text-text-secondary">{memberCount} 人</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:bg-list-hover transition-colors">
            <Phone size={18} />
          </button>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:bg-list-hover transition-colors">
            <Video size={18} />
          </button>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:bg-list-hover transition-colors">
            <UsersIcon size={18} />
          </button>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:bg-list-hover transition-colors">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      {/* 消息列表 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4">
        {messages.map((msg, index) => {
          const prevMsg = index > 0 ? messages[index - 1] : undefined;
          const showDivider = shouldShowTimeDivider(msg, prevMsg);
          const isSelf = msg.sender_id === currentUserId;
          const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id || showDivider;

          return (
            <div key={msg.id}>
              {/* 时间分割线 */}
              {showDivider && (
                <div className="flex items-center justify-center py-3">
                  <span className="text-xs text-text-placeholder bg-bg-page px-3 py-0.5">
                    {formatDividerTime(msg.created_at)}
                  </span>
                </div>
              )}
              <MessageBubble
                message={msg}
                isSelf={isSelf}
                showAvatar={showAvatar}
                showName={conversation.type === "group"}
              />
            </div>
          );
        })}

        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-text-placeholder text-sm">暂无消息，发送第一条消息吧</p>
          </div>
        )}
      </div>

      {/* 消息输入框 */}
      <MessageInput onSend={handleSend} onFileUpload={handleFileUpload} />
    </div>
  );
}
