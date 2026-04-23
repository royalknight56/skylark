/**
 * 添加联系人弹窗
 * 搜索企业内部成员并添加为联系人
 * @author skylark
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, UserPlus, Loader2, Check, Users } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useOrg } from "@/lib/org-context";
import type { OrgMember, User } from "@/lib/types";

interface AddContactModalProps {
  open: boolean;
  onClose: () => void;
  /** 添加成功后回调，用于刷新联系人列表 */
  onAdded: () => void;
}

export default function AddContactModal({ open, onClose, onAdded }: AddContactModalProps) {
  const { currentOrg } = useOrg();
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<(OrgMember & { user: User })[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  /** 打开时聚焦并重置状态 */
  useEffect(() => {
    if (open) {
      setKeyword("");
      setResults([]);
      setAddedIds(new Set());
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  /** 搜索（带防抖） */
  const doSearch = useCallback(
    (q: string) => {
      if (!currentOrg || !q.trim()) {
        setResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      fetch(`/api/contacts/search?org_id=${currentOrg.id}&q=${encodeURIComponent(q.trim())}`)
        .then((res) => res.json() as Promise<{ success: boolean; data?: (OrgMember & { user: User })[] }>)
        .then((json) => {
          if (json.success && json.data) setResults(json.data);
        })
        .finally(() => setSearching(false));
    },
    [currentOrg]
  );

  const handleInputChange = (val: string) => {
    setKeyword(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  /** 添加联系人 */
  const handleAdd = async (targetUserId: string) => {
    if (!currentOrg || addingId) return;
    setAddingId(targetUserId);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: currentOrg.id, contact_id: targetUserId }),
      });
      const json = (await res.json()) as { success: boolean };
      if (json.success) {
        setAddedIds((prev) => new Set(prev).add(targetUserId));
        onAdded();
      }
    } finally {
      setAddingId(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 弹窗 */}
      <div className="relative w-full max-w-md bg-panel-bg rounded-2xl shadow-2xl border border-panel-border overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-panel-border">
          <h3 className="text-base font-semibold text-text-primary">添加联系人</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-text-placeholder hover:bg-list-hover transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* 搜索框 */}
        <div className="px-5 py-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-placeholder" />
            <input
              ref={inputRef}
              type="text"
              value={keyword}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="输入姓名或邮箱搜索企业成员..."
              className="w-full h-10 pl-9 pr-4 rounded-lg bg-bg-page border border-panel-border text-sm
                text-text-primary placeholder:text-text-placeholder
                focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* 搜索结果 */}
        <div className="max-h-72 overflow-y-auto px-2 pb-3">
          {searching && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="text-primary animate-spin" />
            </div>
          )}

          {!searching && keyword.trim() && results.length === 0 && (
            <div className="flex flex-col items-center py-10 text-text-placeholder text-sm">
              <Users size={28} className="mb-2 opacity-40" />
              <p>未找到匹配的成员</p>
            </div>
          )}

          {!searching &&
            results.map((member) => {
              const isAdded = addedIds.has(member.user_id);
              const isAdding = addingId === member.user_id;
              return (
                <div
                  key={member.user_id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-list-hover transition-colors"
                >
                  <Avatar name={member.user.name} avatarUrl={member.user.avatar_url} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {member.user.name}
                    </p>
                    <p className="text-xs text-text-placeholder truncate">{member.user.email}</p>
                    {member.department && (
                      <p className="text-xs text-text-placeholder">{member.department}</p>
                    )}
                  </div>
                  {isAdded ? (
                    <span className="flex items-center gap-1 text-xs text-green-500 font-medium px-2 py-1">
                      <Check size={14} />
                      已添加
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAdd(member.user_id)}
                      disabled={isAdding}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary
                        bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
                    >
                      {isAdding ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <UserPlus size={13} />
                      )}
                      添加
                    </button>
                  )}
                </div>
              );
            })}

          {!searching && !keyword.trim() && (
            <p className="text-center text-text-placeholder text-xs py-8">
              输入关键词搜索企业内成员
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
