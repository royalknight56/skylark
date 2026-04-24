/**
 * 管理后台 - 成员管理（增强版，参照飞书成员管理）
 * 支持：成员列表 + 搜索筛选 + 详情侧栏 + 编辑基本/工作信息 + 邀请管理
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search, Loader2, Users, ChevronDown,
  X, Pencil, Trash2, Shield, Phone,
  Mail, Building2, Briefcase, Hash,
  MapPin, User2, Calendar, Check,
  UserPlus, Send, Copy, Clock, Link,
  XCircle, Plus,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import type { OrgMember, OrgMemberRole, OrgInvite, User, Gender, Department } from "@/lib/types";

/** 角色配置 */
const ROLE_CONFIG: Record<OrgMemberRole, { label: string; badge: string }> = {
  owner: { label: "创建者", badge: "bg-amber-100 text-amber-700" },
  admin: { label: "管理员", badge: "bg-blue-100 text-blue-700" },
  member: { label: "成员", badge: "bg-gray-100 text-gray-600" },
};

const GENDER_OPTIONS: { value: Gender | ""; label: string }[] = [
  { value: "", label: "未设置" },
  { value: "male", label: "男" },
  { value: "female", label: "女" },
];

type MemberWithUser = OrgMember & { user: User };
type ActiveTab = "members" | "invites";

export default function AdminMembersPage() {
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>("members");
  const [members, setMembers] = useState<MemberWithUser[]>([]);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");

  // 详情侧栏
  const [selectedMember, setSelectedMember] = useState<MemberWithUser | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // 编辑表单
  const [editName, setEditName] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editEmployeeId, setEditEmployeeId] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editWorkCity, setEditWorkCity] = useState("");
  const [editGender, setEditGender] = useState<Gender | "">("");
  const [editRole, setEditRole] = useState<OrgMemberRole>("member");

  // 邀请弹窗
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteExpires, setInviteExpires] = useState(7);
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    invited: OrgInvite[];
    skipped: { email: string; reason: string }[];
  } | null>(null);

  /** 加载成员列表 */
  const loadMembers = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/members?org_id=${currentOrg.id}`);
      const json = (await res.json()) as { success: boolean; data?: MemberWithUser[] };
      if (json.success && json.data) setMembers(json.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [currentOrg]);

  /** 加载邀请列表 */
  const loadInvites = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const res = await fetch(`/api/admin/invites?org_id=${currentOrg.id}`);
      const json = (await res.json()) as { success: boolean; data?: OrgInvite[] };
      if (json.success && json.data) setInvites(json.data);
    } catch { /* ignore */ }
  }, [currentOrg]);

  // 部门数据（从部门管理 API 获取）
  const [deptList, setDeptList] = useState<Department[]>([]);

  const loadDepartments = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const res = await fetch(`/api/admin/departments?org_id=${currentOrg.id}`);
      const json = (await res.json()) as { success: boolean; data?: Department[] };
      if (json.success && json.data) setDeptList(json.data);
    } catch { /* ignore */ }
  }, [currentOrg]);

  useEffect(() => { loadMembers(); loadInvites(); loadDepartments(); }, [loadMembers, loadInvites, loadDepartments]);

  /** 扁平化部门名称（用于筛选和选择） */
  const departments = useMemo(() => deptList.map((d) => d.name).sort(), [deptList]);

  /** 搜索 + 部门筛选 */
  const filteredMembers = useMemo(() => {
    let result = members;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.user?.name?.toLowerCase().includes(q) ||
          m.user?.email?.toLowerCase().includes(q) ||
          m.department?.toLowerCase().includes(q) ||
          m.title?.toLowerCase().includes(q) ||
          m.employee_id?.toLowerCase().includes(q) ||
          m.phone?.includes(q)
      );
    }
    if (filterDept) {
      result = result.filter((m) => m.department === filterDept);
    }
    return result;
  }, [members, search, filterDept]);

  /** 打开成员详情 */
  const openDetail = (member: MemberWithUser) => {
    setSelectedMember(member);
    setEditing(false);
    populateForm(member);
  };

  const populateForm = (m: MemberWithUser) => {
    setEditName(m.user?.name || "");
    setEditDept(m.department || "");
    setEditTitle(m.title || "");
    setEditEmployeeId(m.employee_id || "");
    setEditPhone(m.phone || "");
    setEditWorkCity(m.work_city || "");
    setEditGender(m.gender || "");
    setEditRole(m.role);
  };

  /** 保存编辑 */
  const handleSave = async () => {
    if (!currentOrg || !selectedMember) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        org_id: currentOrg.id,
        target_user_id: selectedMember.user_id,
      };
      if (editName.trim() !== (selectedMember.user?.name || "")) payload.name = editName.trim();
      if (editDept !== (selectedMember.department || "")) payload.department = editDept || null;
      if (editTitle !== (selectedMember.title || "")) payload.title = editTitle || null;
      if (editEmployeeId !== (selectedMember.employee_id || "")) payload.employee_id = editEmployeeId || null;
      if (editPhone !== (selectedMember.phone || "")) payload.phone = editPhone || null;
      if (editWorkCity !== (selectedMember.work_city || "")) payload.work_city = editWorkCity || null;
      if (editGender !== (selectedMember.gender || "")) payload.gender = editGender || null;
      if (editRole !== selectedMember.role && selectedMember.user_id !== user?.id)
        payload.role = editRole;

      const res = await fetch("/api/admin/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { success: boolean; data?: MemberWithUser };
      if (json.success) {
        setEditing(false);
        if (json.data) {
          setSelectedMember(json.data);
          setMembers((prev) => prev.map((m) => (m.user_id === json.data!.user_id ? json.data! : m)));
        } else {
          await loadMembers();
        }
      }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  /** 移除成员 */
  const handleRemove = async (member: MemberWithUser) => {
    if (!currentOrg || member.role === "owner" || member.user_id === user?.id) return;
    if (!confirm(`确定移除成员「${member.user?.name}」？此操作不可撤销。`)) return;
    try {
      await fetch("/api/admin/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: currentOrg.id, target_user_id: member.user_id }),
      });
      setSelectedMember(null);
      await loadMembers();
    } catch { /* ignore */ }
  };

  /** 发送邀请 */
  const handleInvite = async () => {
    if (!currentOrg || !inviteEmails.trim()) return;
    setInviting(true);
    setInviteResult(null);
    try {
      const emails = inviteEmails
        .split(/[,;\n\s]+/)
        .map((e) => e.trim())
        .filter(Boolean);

      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: currentOrg.id,
          emails,
          expires_days: inviteExpires,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { invited: OrgInvite[]; skipped: { email: string; reason: string }[] };
      };
      if (json.success && json.data) {
        setInviteResult(json.data);
        setInviteEmails("");
        await loadInvites();
      }
    } catch { /* ignore */ }
    finally { setInviting(false); }
  };

  /** 撤销邀请 */
  const handleCancelInvite = async (invite: OrgInvite) => {
    if (!currentOrg) return;
    try {
      await fetch("/api/admin/invites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: currentOrg.id, invite_id: invite.id }),
      });
      await loadInvites();
    } catch { /* ignore */ }
  };

  /** 复制邀请链接 */
  const copyInviteLink = (invite: OrgInvite) => {
    const link = `${window.location.origin}/invite/${invite.id}`;
    navigator.clipboard.writeText(link);
  };

  /** 复制邀请码 */
  const copyInviteCode = () => {
    if (currentOrg?.invite_code) {
      navigator.clipboard.writeText(currentOrg.invite_code);
    }
  };

  /** 待处理邀请数 */
  const pendingCount = invites.filter((i) => i.status === "pending").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* 左侧主内容 */}
      <div className={`flex-1 min-w-0 ${selectedMember ? "pr-0" : ""}`}>
        {/* 头部 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <Users size={22} className="text-primary" />
              成员管理
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              共 {members.length} 名成员
              {pendingCount > 0 && ` · ${pendingCount} 个待处理邀请`}
            </p>
          </div>
          <button onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium
              hover:bg-primary/90 transition-colors">
            <UserPlus size={16} /> 邀请成员
          </button>
        </div>

        {/* Tab 栏 */}
        <div className="flex gap-1 mb-4 border-b border-panel-border">
          <button onClick={() => setActiveTab("members")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px
              ${activeTab === "members"
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary"}`}>
            成员列表
          </button>
          <button onClick={() => setActiveTab("invites")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5
              ${activeTab === "invites"
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary"}`}>
            邀请记录
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary font-semibold">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* 成员列表 Tab */}
        {activeTab === "members" && (
          <>
            {/* 搜索 + 筛选 */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-placeholder" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索姓名、邮箱、部门、职务、工号、手机号…"
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-panel-border text-sm bg-bg-page
                    text-text-primary placeholder:text-text-placeholder outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              {departments.length > 0 && (
                <div className="relative">
                  <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
                    className="h-9 pl-3 pr-8 rounded-lg border border-panel-border text-sm bg-bg-page
                      text-text-primary outline-none appearance-none cursor-pointer">
                    <option value="">全部部门</option>
                    {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-placeholder pointer-events-none" />
                </div>
              )}
            </div>

            {/* 邀请码快捷区 */}
            {currentOrg?.invite_code && (
              <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-blue-50 rounded-lg border border-blue-100">
                <Link size={14} className="text-blue-600 shrink-0" />
                <span className="text-xs text-blue-700">
                  企业邀请码：<span className="font-mono font-bold">{currentOrg.invite_code}</span>
                </span>
                <button onClick={copyInviteCode}
                  className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-blue-600 bg-blue-100 rounded hover:bg-blue-200 transition-colors">
                  <Copy size={10} /> 复制
                </button>
              </div>
            )}

            {/* 成员表格 */}
            <div className="bg-panel-bg rounded-xl border border-panel-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-panel-border bg-bg-page/50">
                    <th className="text-left px-4 py-2.5 font-medium text-text-secondary">成员</th>
                    <th className="text-left px-3 py-2.5 font-medium text-text-secondary hidden md:table-cell">部门</th>
                    <th className="text-left px-3 py-2.5 font-medium text-text-secondary hidden lg:table-cell">职务</th>
                    <th className="text-left px-3 py-2.5 font-medium text-text-secondary hidden lg:table-cell">工号</th>
                    <th className="text-left px-3 py-2.5 font-medium text-text-secondary">角色</th>
                    <th className="text-left px-3 py-2.5 font-medium text-text-secondary hidden xl:table-cell">加入时间</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((m) => {
                    const roleConfig = ROLE_CONFIG[m.role];
                    const isSelected = selectedMember?.user_id === m.user_id;
                    return (
                      <tr key={m.user_id} onClick={() => openDetail(m)}
                        className={`border-b border-panel-border last:border-b-0 cursor-pointer transition-colors
                          ${isSelected ? "bg-primary/5" : "hover:bg-list-hover"}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={m.user?.name || ""} avatarUrl={m.user?.avatar_url} size="sm" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-text-primary truncate">{m.user?.name}</p>
                              <p className="text-xs text-text-placeholder truncate">{m.user?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 hidden md:table-cell">
                          <span className="text-sm text-text-secondary">{m.department || "—"}</span>
                        </td>
                        <td className="px-3 py-3 hidden lg:table-cell">
                          <span className="text-sm text-text-secondary">{m.title || "—"}</span>
                        </td>
                        <td className="px-3 py-3 hidden lg:table-cell">
                          <span className="text-xs text-text-placeholder font-mono">{m.employee_id || "—"}</span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${roleConfig.badge}`}>
                            {roleConfig.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 hidden xl:table-cell">
                          <span className="text-xs text-text-placeholder">{new Date(m.joined_at).toLocaleDateString("zh-CN")}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredMembers.length === 0 && (
                <div className="py-12 text-center">
                  <Users size={32} className="mx-auto mb-2 text-text-placeholder opacity-40" />
                  <p className="text-sm text-text-secondary">{search ? "没有匹配的成员" : "暂无成员"}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* 邀请记录 Tab */}
        {activeTab === "invites" && (
          <InviteListPanel
            invites={invites}
            onCancel={handleCancelInvite}
            onCopyLink={copyInviteLink}
            onInvite={() => setShowInviteModal(true)}
          />
        )}
      </div>

      {/* 右侧：成员详情侧栏 */}
      {selectedMember && activeTab === "members" && (
        <MemberDetailPanel
          member={selectedMember}
          isOwner={selectedMember.role === "owner"}
          isSelf={selectedMember.user_id === user?.id}
          editing={editing}
          saving={saving}
          departments={departments}
          editName={editName} setEditName={setEditName}
          editDept={editDept} setEditDept={setEditDept}
          editTitle={editTitle} setEditTitle={setEditTitle}
          editEmployeeId={editEmployeeId} setEditEmployeeId={setEditEmployeeId}
          editPhone={editPhone} setEditPhone={setEditPhone}
          editWorkCity={editWorkCity} setEditWorkCity={setEditWorkCity}
          editGender={editGender} setEditGender={setEditGender}
          editRole={editRole} setEditRole={setEditRole}
          onEdit={() => setEditing(true)}
          onCancel={() => { setEditing(false); populateForm(selectedMember); }}
          onSave={handleSave}
          onRemove={() => handleRemove(selectedMember)}
          onClose={() => setSelectedMember(null)}
        />
      )}

      {/* 邀请成员弹窗 */}
      {showInviteModal && (
        <InviteModal
          inviting={inviting}
          inviteEmails={inviteEmails}
          setInviteEmails={setInviteEmails}
          inviteExpires={inviteExpires}
          setInviteExpires={setInviteExpires}
          inviteResult={inviteResult}
          onInvite={handleInvite}
          onClose={() => { setShowInviteModal(false); setInviteResult(null); }}
        />
      )}
    </div>
  );
}

/* ========== 邀请成员弹窗 ========== */
function InviteModal({
  inviting, inviteEmails, setInviteEmails, inviteExpires, setInviteExpires,
  inviteResult, onInvite, onClose,
}: {
  inviting: boolean;
  inviteEmails: string;
  setInviteEmails: (v: string) => void;
  inviteExpires: number;
  setInviteExpires: (v: number) => void;
  inviteResult: { invited: OrgInvite[]; skipped: { email: string; reason: string }[] } | null;
  onInvite: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-panel-bg rounded-2xl shadow-2xl border border-panel-border z-50 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-panel-border">
          <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <UserPlus size={18} className="text-primary" /> 邀请成员
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-text-placeholder hover:bg-list-hover">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">
              邮箱地址 <span className="text-text-placeholder">（多个邮箱用逗号、分号或换行分隔）</span>
            </label>
            <textarea
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.target.value)}
              placeholder={"例如：\nzhangsan@company.com\nlisi@company.com"}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-panel-border text-sm bg-bg-page
                text-text-primary placeholder:text-text-placeholder outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1.5">邀请有效期</label>
            <select value={inviteExpires} onChange={(e) => setInviteExpires(Number(e.target.value))}
              className="h-9 px-3 rounded-lg border border-panel-border text-sm bg-bg-page outline-none">
              <option value={3}>3 天</option>
              <option value={7}>7 天</option>
              <option value={14}>14 天</option>
              <option value={30}>30 天</option>
            </select>
          </div>

          {/* 邀请结果 */}
          {inviteResult && (
            <div className="space-y-2">
              {inviteResult.invited.length > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs font-medium text-green-700 mb-1">
                    成功邀请 {inviteResult.invited.length} 人
                  </p>
                  {inviteResult.invited.map((inv) => (
                    <p key={inv.id} className="text-xs text-green-600 flex items-center gap-1">
                      <Check size={11} /> {inv.invitee_email}
                    </p>
                  ))}
                </div>
              )}
              {inviteResult.skipped.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs font-medium text-yellow-700 mb-1">
                    已跳过 {inviteResult.skipped.length} 人
                  </p>
                  {inviteResult.skipped.map((s, i) => (
                    <p key={i} className="text-xs text-yellow-600">{s.email}：{s.reason}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-panel-border flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:bg-list-hover rounded-lg transition-colors">
            关闭
          </button>
          <button onClick={onInvite} disabled={inviting || !inviteEmails.trim()}
            className="flex items-center gap-1.5 px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium
              hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {inviting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            发送邀请
          </button>
        </div>
      </div>
    </>
  );
}

/* ========== 邀请记录列表 ========== */
function InviteListPanel({
  invites, onCancel, onCopyLink, onInvite,
}: {
  invites: OrgInvite[];
  onCancel: (i: OrgInvite) => void;
  onCopyLink: (i: OrgInvite) => void;
  onInvite: () => void;
}) {
  const STATUS_MAP: Record<string, { label: string; color: string }> = {
    pending: { label: "待接受", color: "bg-yellow-100 text-yellow-700" },
    accepted: { label: "已加入", color: "bg-green-100 text-green-700" },
    expired: { label: "已过期", color: "bg-gray-100 text-gray-500" },
  };

  if (invites.length === 0) {
    return (
      <div className="bg-panel-bg rounded-xl border border-panel-border p-12 text-center">
        <Send size={36} className="mx-auto mb-3 text-text-placeholder opacity-40" />
        <p className="text-sm text-text-secondary mb-1">暂无邀请记录</p>
        <p className="text-xs text-text-placeholder mb-4">通过邮箱邀请成员加入企业</p>
        <button onClick={onInvite}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm
            hover:bg-primary/90 transition-colors">
          <Plus size={14} /> 邀请成员
        </button>
      </div>
    );
  }

  return (
    <div className="bg-panel-bg rounded-xl border border-panel-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-panel-border bg-bg-page/50">
            <th className="text-left px-4 py-2.5 font-medium text-text-secondary">邮箱</th>
            <th className="text-left px-3 py-2.5 font-medium text-text-secondary hidden md:table-cell">邀请人</th>
            <th className="text-left px-3 py-2.5 font-medium text-text-secondary">状态</th>
            <th className="text-left px-3 py-2.5 font-medium text-text-secondary hidden lg:table-cell">邀请时间</th>
            <th className="text-left px-3 py-2.5 font-medium text-text-secondary hidden lg:table-cell">过期时间</th>
            <th className="text-right px-4 py-2.5 font-medium text-text-secondary">操作</th>
          </tr>
        </thead>
        <tbody>
          {invites.map((inv) => {
            const st = STATUS_MAP[inv.status] || STATUS_MAP.expired;
            const isPending = inv.status === "pending";
            return (
              <tr key={inv.id} className="border-b border-panel-border last:border-b-0 hover:bg-list-hover">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-text-placeholder shrink-0" />
                    <span className="text-sm text-text-primary truncate">{inv.invitee_email}</span>
                  </div>
                </td>
                <td className="px-3 py-3 hidden md:table-cell">
                  <span className="text-xs text-text-secondary">{inv.inviter?.name || "—"}</span>
                </td>
                <td className="px-3 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${st.color}`}>
                    {st.label}
                  </span>
                </td>
                <td className="px-3 py-3 hidden lg:table-cell">
                  <span className="text-xs text-text-placeholder">
                    {new Date(inv.created_at).toLocaleDateString("zh-CN")}
                  </span>
                </td>
                <td className="px-3 py-3 hidden lg:table-cell">
                  <span className="text-xs text-text-placeholder flex items-center gap-1">
                    <Clock size={10} />
                    {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString("zh-CN") : "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {isPending && (
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onCopyLink(inv)} title="复制邀请链接"
                        className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:bg-list-hover hover:text-primary">
                        <Link size={13} />
                      </button>
                      <button onClick={() => onCancel(inv)} title="撤销邀请"
                        className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:bg-red-50 hover:text-red-500">
                        <XCircle size={13} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ========== 成员详情侧栏 ========== */
interface DetailPanelProps {
  member: MemberWithUser;
  isOwner: boolean;
  isSelf: boolean;
  editing: boolean;
  saving: boolean;
  departments: string[];
  editName: string; setEditName: (v: string) => void;
  editDept: string; setEditDept: (v: string) => void;
  editTitle: string; setEditTitle: (v: string) => void;
  editEmployeeId: string; setEditEmployeeId: (v: string) => void;
  editPhone: string; setEditPhone: (v: string) => void;
  editWorkCity: string; setEditWorkCity: (v: string) => void;
  editGender: Gender | ""; setEditGender: (v: Gender | "") => void;
  editRole: OrgMemberRole; setEditRole: (v: OrgMemberRole) => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onRemove: () => void;
  onClose: () => void;
}

function MemberDetailPanel({
  member, isOwner, isSelf, editing, saving, departments,
  editName, setEditName, editDept, setEditDept,
  editTitle, setEditTitle, editEmployeeId, setEditEmployeeId,
  editPhone, setEditPhone, editWorkCity, setEditWorkCity,
  editGender, setEditGender, editRole, setEditRole,
  onEdit, onCancel, onSave, onRemove, onClose,
}: DetailPanelProps) {
  const roleConfig = ROLE_CONFIG[member.role];
  return (
    <div className="w-80 xl:w-96 border-l border-panel-border bg-panel-bg shrink-0 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border">
        <h3 className="text-sm font-semibold text-text-primary">成员详情</h3>
        <div className="flex items-center gap-1">
          {!editing && (
            <button onClick={onEdit} className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:bg-list-hover" title="编辑">
              <Pencil size={14} />
            </button>
          )}
          <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-text-placeholder hover:bg-list-hover">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 用户卡片 */}
        <div className="px-5 py-5 border-b border-panel-border text-center">
          <div className="mx-auto mb-3">
            <Avatar name={member.user?.name || ""} avatarUrl={member.user?.avatar_url} size="lg" />
          </div>
          {editing ? (
            <input value={editName} onChange={(e) => setEditName(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-panel-border text-sm text-center bg-bg-page outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="成员姓名" />
          ) : (
            <h4 className="text-lg font-semibold text-text-primary">{member.user?.name}</h4>
          )}
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${roleConfig.badge}`}>{roleConfig.label}</span>
            {member.user?.status === "online" && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> 在线
              </span>
            )}
          </div>
        </div>

        {/* 基本信息 */}
        <div className="px-5 py-4 border-b border-panel-border">
          <h5 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">基本信息</h5>
          <div className="space-y-3">
            <InfoRow icon={<Mail size={14} />} label="邮箱" value={member.user?.email || ""} />
            {editing ? (
              <EditRow icon={<User2 size={14} />} label="性别">
                <select value={editGender} onChange={(e) => setEditGender(e.target.value as Gender | "")}
                  className="flex-1 h-8 px-2 rounded-md border border-panel-border text-xs bg-bg-page outline-none">
                  {GENDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </EditRow>
            ) : (
              <InfoRow icon={<User2 size={14} />} label="性别"
                value={member.gender === "male" ? "男" : member.gender === "female" ? "女" : "未设置"} />
            )}
            {editing ? (
              <EditRow icon={<Phone size={14} />} label="手机号">
                <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="手机号码"
                  className="flex-1 h-8 px-2 rounded-md border border-panel-border text-xs bg-bg-page outline-none" />
              </EditRow>
            ) : (
              <InfoRow icon={<Phone size={14} />} label="手机号" value={member.phone || "未设置"} />
            )}
            <InfoRow icon={<Calendar size={14} />} label="加入时间"
              value={new Date(member.joined_at).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })} />
          </div>
        </div>

        {/* 工作信息 */}
        <div className="px-5 py-4 border-b border-panel-border">
          <h5 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">工作信息</h5>
          <div className="space-y-3">
            {editing ? (
              <EditRow icon={<Building2 size={14} />} label="部门">
                <select value={editDept} onChange={(e) => setEditDept(e.target.value)}
                  className="flex-1 h-8 px-2 rounded-md border border-panel-border text-xs bg-bg-page outline-none">
                  <option value="">未分配</option>
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </EditRow>
            ) : (
              <InfoRow icon={<Building2 size={14} />} label="部门" value={member.department || "未分配"} />
            )}
            {editing ? (
              <EditRow icon={<Briefcase size={14} />} label="职务">
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="职务/头衔"
                  className="flex-1 h-8 px-2 rounded-md border border-panel-border text-xs bg-bg-page outline-none" />
              </EditRow>
            ) : (
              <InfoRow icon={<Briefcase size={14} />} label="职务" value={member.title || "未设置"} />
            )}
            {editing ? (
              <EditRow icon={<Hash size={14} />} label="工号">
                <input value={editEmployeeId} onChange={(e) => setEditEmployeeId(e.target.value)} placeholder="员工工号"
                  className="flex-1 h-8 px-2 rounded-md border border-panel-border text-xs bg-bg-page outline-none" />
              </EditRow>
            ) : (
              <InfoRow icon={<Hash size={14} />} label="工号" value={member.employee_id || "未设置"} />
            )}
            {editing ? (
              <EditRow icon={<MapPin size={14} />} label="工作城市">
                <input value={editWorkCity} onChange={(e) => setEditWorkCity(e.target.value)} placeholder="工作城市"
                  className="flex-1 h-8 px-2 rounded-md border border-panel-border text-xs bg-bg-page outline-none" />
              </EditRow>
            ) : (
              <InfoRow icon={<MapPin size={14} />} label="工作城市" value={member.work_city || "未设置"} />
            )}
            {editing && !isSelf && !isOwner ? (
              <EditRow icon={<Shield size={14} />} label="角色">
                <select value={editRole} onChange={(e) => setEditRole(e.target.value as OrgMemberRole)}
                  className="flex-1 h-8 px-2 rounded-md border border-panel-border text-xs bg-bg-page outline-none">
                  <option value="admin">管理员</option>
                  <option value="member">成员</option>
                </select>
              </EditRow>
            ) : (
              <InfoRow icon={<Shield size={14} />} label="角色" value={ROLE_CONFIG[member.role].label} />
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-panel-border shrink-0">
        {editing ? (
          <div className="flex gap-2">
            <button onClick={onCancel}
              className="flex-1 h-8 rounded-lg border border-panel-border text-sm text-text-secondary hover:bg-list-hover transition-colors">
              取消
            </button>
            <button onClick={onSave} disabled={saving || !editName.trim()}
              className="flex-1 h-8 rounded-lg bg-primary text-white text-sm font-medium
                hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-1">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              保存
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={onEdit}
              className="flex-1 h-8 rounded-lg bg-primary text-white text-sm font-medium
                hover:bg-primary/90 transition-colors flex items-center justify-center gap-1">
              <Pencil size={13} /> 编辑信息
            </button>
            {!isOwner && !isSelf && (
              <button onClick={onRemove}
                className="h-8 px-3 rounded-lg border border-red-200 text-sm text-red-500
                  hover:bg-red-50 transition-colors flex items-center gap-1">
                <Trash2 size={13} /> 移除
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ========== 信息行 ========== */
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-text-placeholder shrink-0">{icon}</span>
      <span className="text-text-secondary w-14 shrink-0">{label}</span>
      <span className="text-text-primary truncate flex-1">{value}</span>
    </div>
  );
}

function EditRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-text-placeholder shrink-0">{icon}</span>
      <span className="text-text-secondary w-14 shrink-0">{label}</span>
      {children}
    </div>
  );
}
