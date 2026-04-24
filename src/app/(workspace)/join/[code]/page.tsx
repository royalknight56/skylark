/**
 * 邀请链接加入群组页面
 * @author skylark
 */

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Users, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import type { Conversation } from "@/lib/types";

export default function JoinGroupPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  /* 加载群组信息 */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/conversations/join/preview?code=${code}`);
        const json = (await res.json()) as { success: boolean; data?: Conversation; error?: string };
        if (json.success && json.data) {
          setConversation(json.data);
        } else {
          setError(json.error || "邀请链接无效");
        }
      } catch {
        setError("网络错误");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [code]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await fetch("/api/conversations/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: code }),
      });
      const json = (await res.json()) as { success: boolean; data?: { conversation_id: string; already_member: boolean }; error?: string };
      if (json.success && json.data) {
        setJoined(true);
        setTimeout(() => {
          router.push(`/messages/${json.data!.conversation_id}`);
        }, 1000);
      } else {
        setError(json.error || "加入失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-bg-page">
      <div className="w-full max-w-sm bg-panel-bg rounded-2xl shadow-lg border border-panel-border p-8">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 size={32} className="text-primary animate-spin" />
            <p className="text-sm text-text-secondary">加载群组信息…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <AlertCircle size={32} className="text-red-400" />
            <p className="text-sm text-red-500">{error}</p>
            <button
              onClick={() => router.push("/messages")}
              className="mt-2 px-4 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg"
            >
              返回消息
            </button>
          </div>
        ) : joined ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle size={32} className="text-green-500" />
            <p className="text-sm text-text-primary font-medium">加入成功！</p>
            <p className="text-xs text-text-secondary">正在跳转…</p>
          </div>
        ) : conversation ? (
          <div className="flex flex-col items-center gap-4">
            <Avatar name={conversation.name || "群组"} avatarUrl={conversation.avatar_url} size="lg" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-text-primary">{conversation.name}</h3>
              {conversation.description && (
                <p className="text-sm text-text-secondary mt-1">{conversation.description}</p>
              )}
              <p className="text-xs text-text-placeholder mt-2 flex items-center justify-center gap-1">
                <Users size={12} />
                邀请你加入群组
              </p>
            </div>
            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {joining && <Loader2 size={14} className="animate-spin" />}
              加入群组
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
