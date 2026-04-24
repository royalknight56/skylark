/**
 * 具体会话页面 - 仅渲染聊天面板
 * 会话列表由上层 layout 持久化
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback, use } from "react";
import { Loader2 } from "lucide-react";
import ChatView from "@/components/messages/ChatView";
import { useMessages } from "../layout";
import { useAuth } from "@/lib/auth-context";
import { useNotification } from "@/lib/notification-context";
import type { Conversation, Message } from "@/lib/types";

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { conversations, refreshConversations } = useMessages();
  const { setTotalUnread } = useNotification();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  /** 从 layout 的会话列表中匹配当前会话，找不到时单独拉取 */
  useEffect(() => {
    const found = conversations.find((c) => c.id === id);
    if (found) {
      setConversation(found);
    } else if (id) {
      fetch(`/api/conversations/${id}`)
        .then((res) => res.json() as Promise<{ success: boolean; data?: Conversation }>)
        .then((json) => {
          if (json.success && json.data) setConversation(json.data);
        })
        .catch(() => {});
    }
  }, [conversations, id]);

  /** 拉取当前会话的消息 */
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setMessages([]);
    fetch(`/api/conversations/${id}/messages`)
      .then((res) => res.json() as Promise<{ success: boolean; data?: Message[] }>)
      .then((json) => {
        if (json.success && json.data) setMessages(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-page">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-page">
        <p className="text-text-secondary">会话不存在</p>
      </div>
    );
  }

  /** 标记已读后刷新会话列表 + 重新计算全局未读数 */
  const handleMarkRead = useCallback(async () => {
    await refreshConversations();
    try {
      const res = await fetch("/api/conversations/unread-total");
      const json = (await res.json()) as { success: boolean; data?: { total: number } };
      if (json.success && json.data) setTotalUnread(json.data.total);
    } catch { /* ignore */ }
  }, [refreshConversations, setTotalUnread]);

  return (
    <ChatView
      conversation={conversation}
      initialMessages={messages}
      currentUserId={user?.id || ""}
      memberCount={4}
      onMarkRead={handleMarkRead}
    />
  );
}
