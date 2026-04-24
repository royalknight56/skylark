/**
 * 消息模块 Layout
 * 会话列表在此层持久化，切换会话时仅右侧内容区更新
 * 监听全局 NotificationHub 事件自动刷新会话列表
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import ConversationList from "@/components/messages/ConversationList";
import CreateGroupModal from "@/components/messages/CreateGroupModal";
import JoinGroupModal from "@/components/messages/JoinGroupModal";
import { useOrg } from "@/lib/org-context";
import { useNotification } from "@/lib/notification-context";
import type { Conversation } from "@/lib/types";

interface MessagesContextValue {
  conversations: Conversation[];
  refreshConversations: () => Promise<void>;
}

const MessagesContext = createContext<MessagesContextValue>({
  conversations: [],
  refreshConversations: async () => {},
});

export function useMessages() {
  return useContext(MessagesContext);
}

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { currentOrg } = useOrg();
  const { lastEvent } = useNotification();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const lastEventIdRef = useRef<string | null>(null);

  const loadConversations = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const res = await fetch(`/api/conversations?org_id=${currentOrg.id}`);
      const json = (await res.json()) as { success: boolean; data?: Conversation[] };
      if (json.success && json.data) setConversations(json.data);
    } catch { /* ignore */ }
  }, [currentOrg]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // 收到新消息通知时刷新会话列表（去重）
  useEffect(() => {
    if (!lastEvent || lastEvent.type !== "new_message") return;
    const eventId = lastEvent.payload.message_id;
    if (eventId === lastEventIdRef.current) return;
    lastEventIdRef.current = eventId;
    loadConversations();
  }, [lastEvent, loadConversations]);

  return (
    <MessagesContext.Provider value={{ conversations, refreshConversations: loadConversations }}>
      <ConversationList
        conversations={conversations}
        onClickCreate={() => setShowCreateGroup(true)}
        onClickJoin={() => setShowJoinGroup(true)}
      />
      {children}
      <CreateGroupModal
        open={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onCreated={(convId) => {
          loadConversations();
          router.push(`/messages/${convId}`);
        }}
      />
      <JoinGroupModal
        open={showJoinGroup}
        onClose={() => setShowJoinGroup(false)}
        onJoined={(convId) => {
          loadConversations();
          router.push(`/messages/${convId}`);
        }}
      />
    </MessagesContext.Provider>
  );
}
