/**
 * 消息模块 Layout
 * 会话列表在此层持久化，切换会话时仅右侧内容区更新
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import ConversationList from "@/components/messages/ConversationList";
import CreateGroupModal from "@/components/messages/CreateGroupModal";
import { useOrg } from "@/lib/org-context";
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const res = await fetch(`/api/conversations?org_id=${currentOrg.id}`);
      const json = (await res.json()) as { success: boolean; data?: Conversation[] };
      if (json.success && json.data) setConversations(json.data);
    } catch { /* ignore */ }
  }, [currentOrg]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  return (
    <MessagesContext.Provider value={{ conversations, refreshConversations: loadConversations }}>
      <ConversationList
        conversations={conversations}
        onClickCreate={() => setShowCreateGroup(true)}
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
    </MessagesContext.Provider>
  );
}
