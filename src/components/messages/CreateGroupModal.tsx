/**
 * 创建群聊弹窗
 * 从企业成员列表多选成员，输入群名后创建群组会话
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  X,
  Search,
  Loader2,
  Users,
  Check,
  MessageSquarePlus,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import type { User, OrgMember } from "@/lib/types";

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
  /** 群聊创建成功后回调，传入新会话 ID */
  onCreated: (conversationId: string) => void;
}

export default function CreateGroupModal({
  open,
  onClose,
  onCreated,
}: CreateGroupModalProps) {
  const { currentOrg } = useOrg();
  const { user } = useAuth();

  const [members, setMembers] = useState<(OrgMember & { user: User })[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [creating, setCreating] = useState(false);

  /** 加载企业全部成员（排除自己） */
  const fetchMembers = useCallback(async () => {
    if (!currentOrg) return;
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/orgs/${currentOrg.id}/members`);
      const json = (await res.json()) as {
        success: boolean;
        data?: (OrgMember & { user: User })[];
      };
      if (json.success && json.data) {
        setMembers(json.data.filter((m) => m.user_id !== user?.id));
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingMembers(false);
    }
  }, [currentOrg, user?.id]);

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setGroupName("");
      setGroupDesc("");
      setIsPublic(false);
      setSearchText("");
      fetchMembers();
    }
  }, [open, fetchMembers]);

  /** 过滤成员 */
  const filteredMembers = useMemo(() => {
    if (!searchText.trim()) return members;
    const q = searchText.toLowerCase();
    return members.filter(
      (m) =>
        m.user.name.toLowerCase().includes(q) ||
        m.user.email.toLowerCase().includes(q)
    );
  }, [members, searchText]);

  /** 切换选中 */
  const toggleSelect = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  /** 从已选列表移除 */
  const removeSelected = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  };

  /** 获取已选用户信息 */
  const selectedUsers = useMemo(
    () => members.filter((m) => selected.has(m.user_id)).map((m) => m.user),
    [members, selected]
  );

  /** 自动生成默认群名 */
  const defaultGroupName = useMemo(() => {
    const names = [user?.name, ...selectedUsers.map((u) => u.name)].filter(
      Boolean
    );
    if (names.length === 0) return "";
    return names.slice(0, 4).join("、") + (names.length > 4 ? "…" : "");
  }, [user, selectedUsers]);

  /** 创建群聊 */
  const handleCreate = async () => {
    if (selected.size < 1 || !currentOrg) return;
    setCreating(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: currentOrg.id,
          type: "group",
          name: groupName.trim() || defaultGroupName,
          description: groupDesc.trim() || undefined,
          is_public: isPublic,
          member_ids: Array.from(selected),
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { id: string };
      };
      if (json.success && json.data) {
        onCreated(json.data.id);
        onClose();
      }
    } catch {
      /* ignore */
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 弹窗 */}
      <div className="relative w-full max-w-lg bg-panel-bg rounded-2xl shadow-2xl border border-panel-border overflow-hidden flex flex-col max-h-[75vh]">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-panel-border shrink-0">
          <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <MessageSquarePlus size={18} className="text-primary" />
            创建群聊
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-text-placeholder hover:bg-list-hover transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* 群名输入 */}
        <div className="px-5 pt-4 pb-2 shrink-0">
          <label className="block text-xs text-text-secondary mb-1.5">
            群聊名称
          </label>
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder={defaultGroupName || "输入群聊名称…"}
            className="w-full h-10 px-3 rounded-lg bg-bg-page border border-panel-border text-sm
              text-text-primary placeholder:text-text-placeholder
              focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* 群描述 */}
        <div className="px-5 pb-2 shrink-0">
          <label className="block text-xs text-text-secondary mb-1.5">
            群描述（可选）
          </label>
          <input
            value={groupDesc}
            onChange={(e) => setGroupDesc(e.target.value)}
            placeholder="输入群描述…"
            maxLength={100}
            className="w-full h-9 px-3 rounded-lg bg-bg-page border border-panel-border text-sm
              text-text-primary placeholder:text-text-placeholder
              focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* 公开群切换 */}
        <div className="px-5 pb-2 shrink-0 flex items-center justify-between">
          <div>
            <p className="text-sm text-text-primary">设为公开群</p>
            <p className="text-xs text-text-placeholder">企业成员可通过搜索加入</p>
          </div>
          <button
            onClick={() => setIsPublic(!isPublic)}
            className={`w-10 h-5.5 rounded-full transition-colors relative ${isPublic ? "bg-primary" : "bg-gray-300"}`}
          >
            <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${isPublic ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>

        {/* 已选成员预览 */}
        {selectedUsers.length > 0 && (
          <div className="px-5 py-2 shrink-0">
            <p className="text-xs text-text-secondary mb-2">
              已选 {selectedUsers.length} 人
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedUsers.map((u) => (
                <span
                  key={u.id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs"
                >
                  {u.name}
                  <button
                    onClick={() => removeSelected(u.id)}
                    className="hover:text-red-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 搜索框 */}
        <div className="px-5 py-2 shrink-0">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-placeholder"
            />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="搜索企业成员…"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-bg-page border border-panel-border text-sm
                text-text-primary placeholder:text-text-placeholder
                focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* 成员列表 */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">
          {loadingMembers ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={20} className="text-primary animate-spin" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-text-placeholder text-sm">
              <Users size={28} className="mb-2 opacity-40" />
              <p>{members.length === 0 ? "企业内暂无其他成员" : "未找到匹配的成员"}</p>
            </div>
          ) : (
            filteredMembers.map((member) => {
              const isSelected = selected.has(member.user_id);
              return (
                <button
                  key={member.user_id}
                  onClick={() => toggleSelect(member.user_id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left
                    ${isSelected ? "bg-primary/5" : "hover:bg-list-hover"}`}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                      ${
                        isSelected
                          ? "bg-primary border-primary"
                          : "border-panel-border"
                      }`}
                  >
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                  <Avatar
                    name={member.user.name}
                    avatarUrl={member.user.avatar_url}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {member.user.name}
                    </p>
                    <p className="text-xs text-text-placeholder truncate">
                      {member.user.email}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="px-5 py-3 border-t border-panel-border flex items-center justify-between shrink-0">
          <p className="text-xs text-text-placeholder">
            至少选择 1 位成员
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-secondary hover:bg-list-hover rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleCreate}
              disabled={selected.size < 1 || creating}
              className="flex items-center gap-1.5 px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium
                hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {creating && <Loader2 size={14} className="animate-spin" />}
              创建 ({selected.size + 1}人)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
