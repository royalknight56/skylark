/**
 * 加入群组弹窗
 * 支持搜索公开群组 + 通过邀请码加入
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Search,
  Loader2,
  Globe,
  Link2,
  Users,
  ArrowRight,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useOrg } from "@/lib/org-context";
import type { Conversation } from "@/lib/types";

interface JoinGroupModalProps {
  open: boolean;
  onClose: () => void;
  onJoined: (conversationId: string) => void;
}

export default function JoinGroupModal({ open, onClose, onJoined }: JoinGroupModalProps) {
  const { currentOrg } = useOrg();
  const [tab, setTab] = useState<"search" | "invite">("search");

  /* ===== 搜索公开群 ===== */
  const [searchText, setSearchText] = useState("");
  const [groups, setGroups] = useState<(Conversation & { member_count: number })[]>([]);
  const [searching, setSearching] = useState(false);
  const [joinLoadingId, setJoinLoadingId] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!currentOrg || !searchText.trim()) { setGroups([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/conversations/search?org_id=${currentOrg.id}&q=${encodeURIComponent(searchText.trim())}`);
      const json = (await res.json()) as { success: boolean; data?: (Conversation & { member_count: number })[] };
      if (json.success && json.data) setGroups(json.data);
    } catch { /* ignore */ } finally {
      setSearching(false);
    }
  }, [currentOrg, searchText]);

  // 防抖搜索
  useEffect(() => {
    if (!searchText.trim()) { setGroups([]); return; }
    const timer = setTimeout(handleSearch, 400);
    return () => clearTimeout(timer);
  }, [searchText, handleSearch]);

  const handleJoinPublic = async (conversationId: string) => {
    setJoinLoadingId(conversationId);
    try {
      const res = await fetch("/api/conversations/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conversationId }),
      });
      const json = (await res.json()) as { success: boolean; data?: { conversation_id: string } };
      if (json.success && json.data) {
        onJoined(json.data.conversation_id);
        onClose();
      }
    } catch { /* ignore */ } finally {
      setJoinLoadingId(null);
    }
  };

  /* ===== 邀请码加入 ===== */
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  const handleJoinByCode = async () => {
    if (!inviteCode.trim()) return;
    setJoining(true);
    setError("");
    try {
      // 从完整链接中提取邀请码
      let code = inviteCode.trim();
      if (code.includes("/join/")) {
        code = code.split("/join/").pop() || code;
      }

      const res = await fetch("/api/conversations/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: code }),
      });
      const json = (await res.json()) as { success: boolean; data?: { conversation_id: string }; error?: string };
      if (json.success && json.data) {
        onJoined(json.data.conversation_id);
        onClose();
      } else {
        setError(json.error || "加入失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setJoining(false);
    }
  };

  useEffect(() => {
    if (open) {
      setSearchText("");
      setGroups([]);
      setInviteCode("");
      setError("");
      setTab("search");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-panel-bg rounded-2xl shadow-2xl border border-panel-border overflow-hidden flex flex-col max-h-[75vh]">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-panel-border shrink-0">
          <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Users size={18} className="text-primary" />
            加入群组
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-text-placeholder hover:bg-list-hover">
            <X size={16} />
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex border-b border-panel-border shrink-0">
          <button
            onClick={() => setTab("search")}
            className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors
              ${tab === "search" ? "text-primary border-b-2 border-primary" : "text-text-secondary hover:text-text-primary"}`}
          >
            <Globe size={14} />
            搜索公开群
          </button>
          <button
            onClick={() => setTab("invite")}
            className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors
              ${tab === "invite" ? "text-primary border-b-2 border-primary" : "text-text-secondary hover:text-text-primary"}`}
          >
            <Link2 size={14} />
            邀请码 / 链接
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {/* ===== 搜索公开群 ===== */}
          {tab === "search" && (
            <div className="space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-placeholder" />
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="输入群名称搜索…"
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-bg-page border border-panel-border text-sm
                    text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {searching ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={20} className="text-primary animate-spin" />
                </div>
              ) : groups.length > 0 ? (
                <div className="space-y-1">
                  {groups.map((g) => (
                    <div key={g.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-list-hover">
                      <Avatar name={g.name || "群组"} avatarUrl={g.avatar_url} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate flex items-center gap-1.5">
                          {g.name}
                          <span className="text-xs text-green-600 bg-green-50 px-1 py-0.5 rounded font-normal">公开</span>
                        </p>
                        {g.description && (
                          <p className="text-xs text-text-secondary truncate">{g.description}</p>
                        )}
                        <p className="text-xs text-text-placeholder">{g.member_count} 位成员</p>
                      </div>
                      <button
                        onClick={() => handleJoinPublic(g.id)}
                        disabled={joinLoadingId === g.id}
                        className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                      >
                        {joinLoadingId === g.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <ArrowRight size={12} />
                        )}
                        加入
                      </button>
                    </div>
                  ))}
                </div>
              ) : searchText.trim() ? (
                <p className="text-center text-sm text-text-placeholder py-8">未找到匹配的公开群组</p>
              ) : (
                <p className="text-center text-sm text-text-placeholder py-8">输入关键词搜索公开群组</p>
              )}
            </div>
          )}

          {/* ===== 邀请码加入 ===== */}
          {tab === "invite" && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                粘贴群邀请链接或邀请码，即可加入群组
              </p>

              <input
                value={inviteCode}
                onChange={(e) => { setInviteCode(e.target.value); setError(""); }}
                placeholder="输入邀请链接或邀请码…"
                className="w-full h-10 px-3 rounded-lg bg-bg-page border border-panel-border text-sm
                  text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30"
              />

              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}

              <button
                onClick={handleJoinByCode}
                disabled={!inviteCode.trim() || joining}
                className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {joining && <Loader2 size={14} className="animate-spin" />}
                加入群组
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
