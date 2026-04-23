/**
 * 消息列表页 - 默认显示（未选中具体会话）
 * @author skylark
 */

"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Loader2 } from "lucide-react";
import ConversationList from "@/components/messages/ConversationList";
import { useOrg } from "@/lib/org-context";
import type { Conversation } from "@/lib/types";

export default function MessagesPage() {
  const { currentOrg } = useOrg();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOrg) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/conversations?org_id=${currentOrg.id}`)
      .then((res) => res.json() as Promise<{ success: boolean; data?: Conversation[] }>)
      .then((json) => {
        if (json.success && json.data) setConversations(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentOrg?.id, currentOrg]);

  return (
    <>
      <ConversationList conversations={conversations} />
      <div className="flex-1 flex flex-col items-center justify-center bg-bg-page">
        {loading ? (
          <Loader2 size={32} className="text-primary animate-spin" />
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center mb-4">
              <MessageSquare size={32} className="text-primary" />
            </div>
            <p className="text-text-secondary text-sm">选择一个会话开始聊天</p>
          </>
        )}
      </div>
    </>
  );
}
