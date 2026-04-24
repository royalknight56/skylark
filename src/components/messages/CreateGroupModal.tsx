/**
 * 创建群聊弹窗
 * 从联系人列表多选成员，输入群名后创建群组会话
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
import type { User, Contact } from "@/lib/types";

interface ContactRow extends Contact {
  contact: User;
}

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

  const [contacts, setContacts] = useState<User[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState("");
  const [searchText, setSearchText] = useState("");
  const [creating, setCreating] = useState(false);

  /** 加载联系人列表 */
  const fetchContacts = useCallback(async () => {
    if (!currentOrg) return;
    setLoadingContacts(true);
    try {
      const res = await fetch(`/api/contacts?org_id=${currentOrg.id}`);
      const json = (await res.json()) as {
        success: boolean;
        data?: ContactRow[];
      };
      if (json.success && json.data) {
        const users = json.data.map((row) => row.contact);
        // 去重
        const seen = new Set<string>();
        const unique: User[] = [];
        for (const u of users) {
          if (!seen.has(u.id)) {
            seen.add(u.id);
            unique.push(u);
          }
        }
        setContacts(unique);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingContacts(false);
    }
  }, [currentOrg]);

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setGroupName("");
      setSearchText("");
      fetchContacts();
    }
  }, [open, fetchContacts]);

  /** 过滤联系人 */
  const filteredContacts = useMemo(() => {
    if (!searchText.trim()) return contacts;
    const q = searchText.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [contacts, searchText]);

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
    () => contacts.filter((c) => selected.has(c.id)),
    [contacts, selected]
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
              placeholder="搜索联系人…"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-bg-page border border-panel-border text-sm
                text-text-primary placeholder:text-text-placeholder
                focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* 联系人列表 */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">
          {loadingContacts ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={20} className="text-primary animate-spin" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-text-placeholder text-sm">
              <Users size={28} className="mb-2 opacity-40" />
              <p>{contacts.length === 0 ? "暂无联系人" : "未找到匹配的联系人"}</p>
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const isSelected = selected.has(contact.id);
              return (
                <button
                  key={contact.id}
                  onClick={() => toggleSelect(contact.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left
                    ${isSelected ? "bg-primary/5" : "hover:bg-list-hover"}`}
                >
                  {/* 选择框 */}
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
                    name={contact.name}
                    avatarUrl={contact.avatar_url}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {contact.name}
                    </p>
                    <p className="text-xs text-text-placeholder truncate">
                      {contact.email}
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
            至少选择 1 位联系人
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
