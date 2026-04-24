/**
 * 文档分享弹窗
 * 选择企业成员，将文档以卡片消息发送到私聊会话
 * @author skylark
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X, Search, Loader2, Send, Check, FileText, Table2,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import type { Document, OrgMember, User } from "@/lib/types";

interface ShareDocModalProps {
  document: Document;
  onClose: () => void;
  onShared?: () => void;
}

type MemberWithUser = OrgMember & { user: User };

export default function ShareDocModal({ document: doc, onClose, onShared }: ShareDocModalProps) {
  const { currentOrg } = useOrg();
  const { user } = useAuth();

  const [members, setMembers] = useState<MemberWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  /** 加载企业成员 */
  useEffect(() => {
    if (!currentOrg) return;
    setLoading(true);
    fetch(`/api/orgs/${currentOrg.id}/members`)
      .then((r) => r.json() as Promise<{ success: boolean; data?: MemberWithUser[] }>)
      .then((json) => {
        if (json.success && json.data) {
          setMembers(json.data.filter((m) => m.user_id !== user?.id));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentOrg, user?.id]);

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) => m.user.name.toLowerCase().includes(q) || m.user.email.toLowerCase().includes(q)
    );
  }, [members, search]);

  const toggleSelect = (uid: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  /** 构造文档卡片消息内容（JSON） */
  const buildCardContent = () =>
    JSON.stringify({
      card_type: "doc",
      doc_id: doc.id,
      title: doc.title,
      doc_type: doc.type,
    });

  /** 发送分享 */
  const handleSend = async () => {
    if (!currentOrg || selectedIds.size === 0) return;
    setSending(true);
    setError("");

    const cardContent = buildCardContent();
    const newSent = new Set(sentIds);

    for (const targetId of selectedIds) {
      try {
        /* 获取或创建私聊会话 */
        const convRes = await fetch("/api/conversations/direct", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ org_id: currentOrg.id, target_user_id: targetId }),
        });
        const convJson = (await convRes.json()) as { success: boolean; data?: { id: string } };
        if (!convJson.success || !convJson.data) continue;

        /* 发送卡片消息 */
        await fetch(`/api/conversations/${convJson.data.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: cardContent, type: "card" }),
        });

        newSent.add(targetId);
      } catch { /* ignore */ }
    }

    setSentIds(newSent);
    setSending(false);

    if (newSent.size > 0) {
      onShared?.();
      setTimeout(onClose, 800);
    } else {
      setError("发送失败，请重试");
    }
  };

  const DocIcon = doc.type === "sheet" ? Table2 : FileText;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-panel-bg rounded-2xl shadow-2xl border border-panel-border z-50 overflow-hidden flex flex-col max-h-[70vh]">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-panel-border shrink-0">
          <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Send size={18} className="text-primary" /> 发送文档
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-text-placeholder hover:bg-list-hover">
            <X size={16} />
          </button>
        </div>

        {/* 文档预览卡片 */}
        <div className="mx-5 mt-4 mb-3 p-3 bg-primary/5 rounded-xl border border-primary/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <DocIcon size={20} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary truncate">{doc.title}</p>
            <p className="text-[10px] text-text-placeholder mt-0.5">
              {doc.type === "sheet" ? "电子表格" : "文档"} · {doc.creator?.name || "我"}
            </p>
          </div>
        </div>

        {/* 搜索 */}
        <div className="px-5 mb-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-placeholder" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索成员…"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-panel-border text-sm bg-bg-page
                text-text-primary placeholder:text-text-placeholder outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        {/* 成员列表 */}
        <div className="flex-1 overflow-y-auto px-2 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-text-placeholder" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-text-placeholder">
              {search ? "未找到匹配的成员" : "暂无可选成员"}
            </div>
          ) : (
            filtered.map((m) => {
              const isSelected = selectedIds.has(m.user_id);
              const isSent = sentIds.has(m.user_id);
              return (
                <button key={m.user_id}
                  onClick={() => { if (!isSent) toggleSelect(m.user_id); }}
                  disabled={isSent}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                    ${isSent ? "opacity-60 cursor-default" : "hover:bg-list-hover cursor-pointer"}
                    ${isSelected && !isSent ? "bg-primary/5" : ""}`}>
                  {/* 选择框 */}
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                    ${isSent ? "bg-green-500 border-green-500"
                      : isSelected ? "bg-primary border-primary" : "border-panel-border"}`}>
                    {(isSelected || isSent) && <Check size={12} className="text-white" />}
                  </div>
                  <Avatar name={m.user.name} avatarUrl={m.user.avatar_url} size="sm" />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm text-text-primary truncate">{m.user.name}</p>
                    <p className="text-xs text-text-placeholder truncate">{m.department || m.user.email}</p>
                  </div>
                  {isSent && <span className="text-[10px] text-green-600 shrink-0">已发送</span>}
                </button>
              );
            })
          )}
        </div>

        {/* 底部 */}
        <div className="px-5 py-3 border-t border-panel-border shrink-0">
          {error && <p className="text-xs text-red-500 mb-2 text-center">{error}</p>}
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-placeholder">
              {selectedIds.size > 0 ? `已选 ${selectedIds.size} 人` : "请选择发送对象"}
            </span>
            <div className="flex gap-2">
              <button onClick={onClose}
                className="px-4 py-2 text-sm text-text-secondary hover:bg-list-hover rounded-lg transition-colors">
                取消
              </button>
              <button onClick={handleSend}
                disabled={sending || selectedIds.size === 0}
                className="flex items-center gap-1.5 px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium
                  hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                发送
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
