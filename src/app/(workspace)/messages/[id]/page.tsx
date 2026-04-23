/**
 * 具体会话页面 - 展示会话列表 + 聊天面板
 * @author skylark
 */

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import ConversationList from "@/components/messages/ConversationList";
import ChatView from "@/components/messages/ChatView";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import type { Conversation, Message } from "@/lib/types";

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { currentOrg } = useOrg();
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  /** 拉取会话列表 */
  useEffect(() => {
    if (!currentOrg) return;
    fetch(`/api/conversations?org_id=${currentOrg.id}`)
      .then((res) => res.json() as Promise<{ success: boolean; data?: Conversation[] }>)
      .then((json) => {
        if (json.success && json.data) setConversations(json.data);
      })
      .catch(() => {});
  }, [currentOrg?.id, currentOrg]);

  /** 拉取当前会话的消息 */
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/conversations/${id}/messages`)
      .then((res) => res.json() as Promise<{ success: boolean; data?: Message[] }>)
      .then((json) => {
        if (json.success && json.data) setMessages(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const conversation = conversations.find((c) => c.id === id) ?? null;

  if (loading) {
    return (
      <>
        <ConversationList conversations={conversations} />
        <div className="flex-1 flex items-center justify-center bg-bg-page">
          <Loader2 size={32} className="text-primary animate-spin" />
        </div>
      </>
    );
  }

  if (!conversation) {
    return (
      <>
        <ConversationList conversations={conversations} />
        <div className="flex-1 flex items-center justify-center bg-bg-page">
          <p className="text-text-secondary">会话不存在</p>
        </div>
      </>
    );
  }

  return (
    <>
      <ConversationList conversations={conversations} />
      <ChatView
        conversation={conversation}
        initialMessages={messages}
        currentUserId={user?.id || ""}
        memberCount={4}
      />
    </>
  );
}
