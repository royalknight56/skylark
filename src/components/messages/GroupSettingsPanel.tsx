/**
 * 群设置侧边面板
 * 群信息编辑 + 成员管理 + 邀请链接 + 公开群切换
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  X,
  Settings,
  Users,
  Link2,
  Globe,
  Lock,
  UserPlus,
  LogOut,
  Trash2,
  Search,
  Check,
  Copy,
  Loader2,
  Edit3,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import type { Conversation, User, OrgMember } from "@/lib/types";
import { useOrg } from "@/lib/org-context";

interface GroupSettingsPanelProps {
  conversation: Conversation;
  currentUserId: string;
  open: boolean;
  onClose: () => void;
  onUpdate: (updated: Conversation) => void;
}

export default function GroupSettingsPanel({
  conversation,
  currentUserId,
  open,
  onClose,
  onUpdate,
}: GroupSettingsPanelProps) {
  const { currentOrg } = useOrg();
  const [tab, setTab] = useState<"info" | "members" | "invite">("info");

  /* ===== 群信息编辑 ===== */
  const [editName, setEditName] = useState(conversation.name || "");
  const [editDesc, setEditDesc] = useState(conversation.description || "");
  const [isPublic, setIsPublic] = useState(!!conversation.is_public);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditName(conversation.name || "");
    setEditDesc(conversation.description || "");
    setIsPublic(!!conversation.is_public);
  }, [conversation]);

  const isOwnerOrAdmin = conversation.created_by === currentUserId;

  const handleSaveInfo = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/conversations/${conversation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim(),
          is_public: isPublic,
        }),
      });
      const json = (await res.json()) as { success: boolean; data?: Conversation };
      if (json.success && json.data) onUpdate(json.data);
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  /* ===== 成员管理 ===== */
  const [members, setMembers] = useState<(User & { role: string })[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/conversations/${conversation.id}`);
      const json = (await res.json()) as { success: boolean; data?: { members: (User & { role: string })[] } };
      if (json.success && json.data) setMembers(json.data.members);
    } catch { /* ignore */ } finally {
      setLoadingMembers(false);
    }
  }, [conversation.id]);

  useEffect(() => {
    if (open && tab === "members") fetchMembers();
  }, [open, tab, fetchMembers]);

  const handleRemoveMember = async (userId: string) => {
    await fetch(`/api/conversations/${conversation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove_member", user_id: userId }),
    });
    fetchMembers();
  };

  const handleLeaveGroup = async () => {
    if (!confirm("确定要退出群组吗？")) return;
    await fetch(`/api/conversations/${conversation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove_member", user_id: currentUserId }),
    });
    window.location.href = "/messages";
  };

  /* ===== 邀请链接 ===== */
  const [inviteLink, setInviteLink] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expireDays, setExpireDays] = useState(7);

  const handleGenerateInvite = async () => {
    setInviteLoading(true);
    try {
      const res = await fetch(`/api/conversations/${conversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_invite", expire_days: expireDays }),
      });
      const json = (await res.json()) as { success: boolean; data?: { link: string; invite_code: string } };
      if (json.success && json.data) {
        setInviteLink(`${window.location.origin}${json.data.link}`);
      }
    } catch { /* ignore */ } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ===== 批量添加成员弹窗 ===== */
  const [orgMembers, setOrgMembers] = useState<(OrgMember & { user: User })[]>([]);
  const [batchSelected, setBatchSelected] = useState<Set<string>>(new Set());
  const [batchSearch, setBatchSearch] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);
  const [addingBatch, setAddingBatch] = useState(false);

  const fetchOrgMembers = useCallback(async () => {
    if (!currentOrg) return;
    setBatchLoading(true);
    try {
      const res = await fetch(`/api/orgs/${currentOrg.id}/members`);
      const json = (await res.json()) as { success: boolean; data?: (OrgMember & { user: User })[] };
      if (json.success && json.data) setOrgMembers(json.data);
    } catch { /* ignore */ } finally {
      setBatchLoading(false);
    }
  }, [currentOrg]);

  useEffect(() => {
    if (showAddModal) {
      setBatchSelected(new Set());
      setBatchSearch("");
      fetchOrgMembers();
    }
  }, [showAddModal, fetchOrgMembers]);

  // 过滤掉已在群组内的成员
  const existingMemberIds = useMemo(() => new Set(members.map((m) => m.id)), [members]);

  const filteredOrgMembers = useMemo(() => {
    let list = orgMembers.filter((m) => !existingMemberIds.has(m.user_id));
    if (batchSearch.trim()) {
      const q = batchSearch.toLowerCase();
      list = list.filter((m) => m.user.name.toLowerCase().includes(q) || m.user.email.toLowerCase().includes(q));
    }
    return list;
  }, [orgMembers, existingMemberIds, batchSearch]);

  const handleBatchAdd = async () => {
    setAddingBatch(true);
    try {
      await fetch(`/api/conversations/${conversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "batch_add", user_ids: Array.from(batchSelected) }),
      });
      setShowAddModal(false);
      fetchMembers();
    } catch { /* ignore */ } finally {
      setAddingBatch(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* 侧边面板 */}
      <div className="w-80 border-l border-panel-border bg-panel-bg flex flex-col h-full shrink-0">
        {/* 头部 */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-panel-border shrink-0">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Settings size={16} className="text-primary" />
            群设置
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-text-placeholder hover:bg-list-hover">
            <X size={16} />
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex border-b border-panel-border shrink-0">
          {[
            { key: "info" as const, label: "群信息", icon: Edit3 },
            { key: "members" as const, label: "成员", icon: Users },
            { key: "invite" as const, label: "邀请", icon: Link2 },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1 transition-colors
                ${tab === key ? "text-primary border-b-2 border-primary" : "text-text-secondary hover:text-text-primary"}`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* ===== 群信息 Tab ===== */}
          {tab === "info" && (
            <div className="space-y-4">
              {/* 群头像 + 名称 */}
              <div className="flex items-center gap-3 mb-4">
                <Avatar name={editName} avatarUrl={conversation.avatar_url} size="lg" />
                <div className="flex-1 min-w-0">
                  {conversation.is_public && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded mb-1">
                      <Globe size={10} /> 公开群
                    </span>
                  )}
                  <p className="text-xs text-text-placeholder">{conversation.id}</p>
                </div>
              </div>

              {/* 群名称 */}
              <div>
                <label className="block text-xs text-text-secondary mb-1">群名称</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={!isOwnerOrAdmin}
                  maxLength={60}
                  className="w-full h-9 px-3 rounded-lg bg-bg-page border border-panel-border text-sm text-text-primary
                    disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* 群描述 */}
              <div>
                <label className="block text-xs text-text-secondary mb-1">群描述</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  disabled={!isOwnerOrAdmin}
                  maxLength={100}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-bg-page border border-panel-border text-sm text-text-primary resize-none
                    disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* 公开群切换 */}
              {isOwnerOrAdmin && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    {isPublic ? <Globe size={14} className="text-green-600" /> : <Lock size={14} className="text-text-secondary" />}
                    <div>
                      <p className="text-sm text-text-primary">{isPublic ? "公开群" : "私有群"}</p>
                      <p className="text-xs text-text-placeholder">{isPublic ? "企业成员可搜索加入" : "仅通过邀请加入"}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsPublic(!isPublic)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${isPublic ? "bg-primary" : "bg-gray-300"}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isPublic ? "translate-x-5.5" : "translate-x-0.5"}`} />
                  </button>
                </div>
              )}

              {/* 保存按钮 */}
              {isOwnerOrAdmin && (
                <button
                  onClick={handleSaveInfo}
                  disabled={saving}
                  className="w-full py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存修改"}
                </button>
              )}

              {/* 退出群组 */}
              {!isOwnerOrAdmin && (
                <button
                  onClick={handleLeaveGroup}
                  className="w-full py-2 text-red-500 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-50"
                >
                  <LogOut size={14} className="inline mr-1" />
                  退出群组
                </button>
              )}
            </div>
          )}

          {/* ===== 成员管理 Tab ===== */}
          {tab === "members" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-text-secondary">成员 ({members.length})</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                >
                  <UserPlus size={14} />
                  添加成员
                </button>
              </div>

              {loadingMembers ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={20} className="text-primary animate-spin" />
                </div>
              ) : (
                <div className="space-y-1">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-list-hover group">
                      <Avatar name={m.name} avatarUrl={m.avatar_url} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary truncate">
                          {m.name}
                          {m.role === "owner" && (
                            <span className="ml-1.5 text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">群主</span>
                          )}
                          {m.role === "admin" && (
                            <span className="ml-1.5 text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">管理员</span>
                          )}
                        </p>
                        <p className="text-xs text-text-placeholder truncate">{m.email}</p>
                      </div>
                      {isOwnerOrAdmin && m.id !== currentUserId && m.role !== "owner" && (
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-opacity"
                          title="移除成员"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== 邀请 Tab ===== */}
          {tab === "invite" && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">生成邀请链接，分享给其他人加入群组</p>

              {/* 有效期选择 */}
              <div>
                <label className="block text-xs text-text-secondary mb-1">链接有效期</label>
                <select
                  value={expireDays}
                  onChange={(e) => setExpireDays(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-lg bg-bg-page border border-panel-border text-sm text-text-primary"
                >
                  <option value={7}>7 天</option>
                  <option value={30}>30 天</option>
                  <option value={365}>1 年</option>
                  <option value={3650}>永久</option>
                </select>
              </div>

              <button
                onClick={handleGenerateInvite}
                disabled={inviteLoading}
                className="w-full py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {inviteLoading ? "生成中..." : "生成邀请链接"}
              </button>

              {inviteLink && (
                <div className="bg-bg-page rounded-lg p-3 space-y-2">
                  <p className="text-xs text-text-secondary">邀请链接</p>
                  <div className="flex items-center gap-2">
                    <input
                      value={inviteLink}
                      readOnly
                      className="flex-1 h-8 px-2 rounded bg-panel-bg border border-panel-border text-xs text-text-primary"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center gap-1 px-3 h-8 bg-primary/10 text-primary rounded text-xs hover:bg-primary/20"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? "已复制" : "复制"}
                    </button>
                  </div>
                </div>
              )}

              {/* 当前邀请码信息 */}
              {conversation.invite_code && (
                <div className="text-xs text-text-placeholder">
                  当前邀请码：{conversation.invite_code}
                  {conversation.invite_expire_at && (
                    <span className="ml-2">
                      有效期至 {new Date(conversation.invite_expire_at).toLocaleDateString("zh-CN")}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== 批量添加成员弹窗 ===== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-md bg-panel-bg rounded-2xl shadow-2xl border border-panel-border overflow-hidden flex flex-col max-h-[70vh]">
            {/* 头部 */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-panel-border shrink-0">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <UserPlus size={16} className="text-primary" />
                添加群成员
              </h3>
              <button onClick={() => setShowAddModal(false)} className="w-7 h-7 rounded-md flex items-center justify-center text-text-placeholder hover:bg-list-hover">
                <X size={16} />
              </button>
            </div>

            {/* 已选预览 */}
            {batchSelected.size > 0 && (
              <div className="px-5 py-2 shrink-0">
                <p className="text-xs text-text-secondary">已选 {batchSelected.size} 人</p>
              </div>
            )}

            {/* 搜索 */}
            <div className="px-5 py-2 shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-placeholder" />
                <input
                  value={batchSearch}
                  onChange={(e) => setBatchSearch(e.target.value)}
                  placeholder="搜索企业成员…"
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-bg-page border border-panel-border text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            {/* 成员列表 */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">
              {batchLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={20} className="text-primary animate-spin" />
                </div>
              ) : filteredOrgMembers.length === 0 ? (
                <p className="text-center text-sm text-text-placeholder py-8">无可添加的成员</p>
              ) : (
                filteredOrgMembers.map((m) => {
                  const selected = batchSelected.has(m.user_id);
                  return (
                    <button
                      key={m.user_id}
                      onClick={() => {
                        setBatchSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(m.user_id)) next.delete(m.user_id);
                          else next.add(m.user_id);
                          return next;
                        });
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${selected ? "bg-primary/5" : "hover:bg-list-hover"}`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${selected ? "bg-primary border-primary" : "border-panel-border"}`}>
                        {selected && <Check size={12} className="text-white" />}
                      </div>
                      <Avatar name={m.user.name} avatarUrl={m.user.avatar_url} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary truncate">{m.user.name}</p>
                        <p className="text-xs text-text-placeholder truncate">{m.user.email}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* 底部 */}
            <div className="px-5 py-3 border-t border-panel-border flex justify-end gap-2 shrink-0">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-text-secondary hover:bg-list-hover rounded-lg">
                取消
              </button>
              <button
                onClick={handleBatchAdd}
                disabled={batchSelected.size === 0 || addingBatch}
                className="flex items-center gap-1.5 px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {addingBatch && <Loader2 size={14} className="animate-spin" />}
                添加 ({batchSelected.size})
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
