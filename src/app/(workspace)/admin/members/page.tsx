/**
 * 管理后台 - 成员管理
 * 支持：成员列表 + 搜索筛选 + 详情侧栏 + 编辑基本/工作信息 + 邀请管理
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Search, Loader2, Users, ChevronDown,
  X, Pencil, Trash2, Shield, Phone,
  Mail, Building2, Briefcase, Hash,
  MapPin, User2, Calendar, Check,
  UserPlus, Send, Copy, Clock, Link,
  XCircle, Plus, Tag, KeyRound, Smartphone,
  ShieldOff, Play, Pause, LogOut, RotateCcw, UserX,
  Pin, PinOff, GripVertical,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import type { OrgMember, OrgMemberRole, OrgInvite, User, Gender, Department, EmployeeType } from "@/lib/types";

/** 角色配置 */
const ROLE_CONFIG: Record<OrgMemberRole, { label: string; badge: string }> = {
  owner: { label: "创建者", badge: "bg-amber-100 text-amber-700" },
  admin: { label: "管理员", badge: "bg-blue-100 text-blue-700" },
  member: { label: "成员", badge: "bg-gray-100 text-gray-600" },
};

/** 在线状态配置 */
const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  online: { label: "在线", dot: "bg-green-500" },
  busy: { label: "忙碌", dot: "bg-red-500" },
  away: { label: "离开", dot: "bg-yellow-500" },
  offline: { label: "离线", dot: "bg-gray-300" },
};

const GENDER_OPTIONS: { value: Gender | ""; label: string }[] = [
  { value: "", label: "未设置" },
  { value: "male", label: "男" },
  { value: "female", label: "女" },
];

type MemberWithUser = OrgMember & { user: User; receiver?: User };
type ActiveTab = "members" | "invites" | "departed";

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
  const [saveError, setSaveError] = useState("");

  // 编辑表单
  const [editName, setEditName] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editEmployeeId, setEditEmployeeId] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editWorkCity, setEditWorkCity] = useState("");
  const [editGender, setEditGender] = useState<Gender | "">("");
  const [editRole, setEditRole] = useState<OrgMemberRole>("member");
  const [editEmployeeType, setEditEmployeeType] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editLoginPhone, setEditLoginPhone] = useState("");

  // 邀请弹窗
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteExpires, setInviteExpires] = useState(7);
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    invited: OrgInvite[];
    skipped: { email: string; reason: string }[];
  } | null>(null);

  // 已离职成员
  const [departedMembers, setDepartedMembers] = useState<MemberWithUser[]>([]);
  const [departedLoading, setDepartedLoading] = useState(false);

  // 离职弹窗
  const [showDepartModal, setShowDepartModal] = useState(false);
  const [departTarget, setDepartTarget] = useState<MemberWithUser | null>(null);
  const [departReceiverId, setDepartReceiverId] = useState("");
  const [transferDocs, setTransferDocs] = useState(true);
  const [transferEvents, setTransferEvents] = useState(true);
  const [transferConversations, setTransferConversations] = useState(true);
  const [departing, setDeparting] = useState(false);

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
  // 人员类型（活跃的，从人员类型管理 API 获取）
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeType[]>([]);

  const loadDepartments = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const res = await fetch(`/api/admin/departments?org_id=${currentOrg.id}`);
      const json = (await res.json()) as { success: boolean; data?: Department[] };
      if (json.success && json.data) setDeptList(json.data);
    } catch { /* ignore */ }
  }, [currentOrg]);

  const loadEmployeeTypes = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const res = await fetch(`/api/admin/employee-types?org_id=${currentOrg.id}`);
      const json = (await res.json()) as { success: boolean; data?: EmployeeType[] };
      if (json.success && json.data) setEmployeeTypes(json.data.filter((t) => t.is_active));
    } catch { /* ignore */ }
  }, [currentOrg]);

  useEffect(() => { loadMembers(); loadInvites(); loadDepartments(); loadEmployeeTypes(); }, [loadMembers, loadInvites, loadDepartments, loadEmployeeTypes]);

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
    setEditEmployeeType(m.employee_type || "");
    setEditEmail(m.user?.email || "");
    setEditLoginPhone(m.user?.login_phone || "");
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
      if (editEmployeeType !== (selectedMember.employee_type || "")) payload.employee_type = editEmployeeType || null;
      if (editEmail.trim() && editEmail.trim() !== (selectedMember.user?.email || ""))
        payload.email = editEmail.trim();
      if (editLoginPhone !== (selectedMember.user?.login_phone || ""))
        payload.login_phone = editLoginPhone || null;
      if (editRole !== selectedMember.role && selectedMember.user_id !== user?.id)
        payload.role = editRole;

      const res = await fetch("/api/admin/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { success: boolean; data?: MemberWithUser; error?: string };
      if (json.success) {
        setEditing(false);
        setSaveError("");
        if (json.data) {
          setSelectedMember(json.data);
          setMembers((prev) => prev.map((m) => (m.user_id === json.data!.user_id ? json.data! : m)));
        } else {
          await loadMembers();
        }
      } else {
        setSaveError(json.error || "保存失败");
      }
    } catch { setSaveError("网络错误"); }
    finally { setSaving(false); }
  };

  /** 加载已离职成员 */
  const loadDeparted = useCallback(async () => {
    if (!currentOrg) return;
    setDepartedLoading(true);
    try {
      const res = await fetch(`/api/admin/departed?org_id=${currentOrg.id}`);
      const json = (await res.json()) as { success: boolean; data?: MemberWithUser[] };
      if (json.success && json.data) setDepartedMembers(json.data);
    } catch { /* ignore */ }
    setDepartedLoading(false);
  }, [currentOrg]);

  useEffect(() => {
    if (activeTab === "departed") loadDeparted();
  }, [activeTab, loadDeparted]);

  /** 打开离职弹窗 */
  const openDepartModal = (member: MemberWithUser) => {
    setDepartTarget(member);
    setDepartReceiverId("");
    setTransferDocs(true);
    setTransferEvents(true);
    setTransferConversations(true);
    setShowDepartModal(true);
  };

  /** 确认离职 */
  const handleDepart = async () => {
    if (!currentOrg || !departTarget) return;
    setDeparting(true);
    try {
      const res = await fetch("/api/admin/departed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: currentOrg.id,
          target_user_id: departTarget.user_id,
          receiver_id: departReceiverId || null,
          transfer_docs: transferDocs,
          transfer_events: transferEvents,
          transfer_conversations: transferConversations,
        }),
      });
      const json = (await res.json()) as { success: boolean; error?: string; transferred?: string[] };
      if (json.success) {
        setShowDepartModal(false);
        setSelectedMember(null);
        await loadMembers();
        alert(`操作成功${json.transferred?.length ? `，已转移：${json.transferred.join('、')}` : ''}`);
      } else {
        alert(json.error || "操作失败");
      }
    } catch { alert("网络错误"); }
    setDeparting(false);
  };

  /** 恢复离职成员 */
  const handleRestoreDeparted = async (m: MemberWithUser) => {
    if (!currentOrg) return;
    if (!confirm(`确定恢复成员「${m.user?.name}」？恢复后该成员将重新变为正常状态。`)) return;
    try {
      const res = await fetch("/api/admin/departed", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: currentOrg.id, target_user_id: m.user_id }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (json.success) {
        await loadDeparted();
        await loadMembers();
      } else {
        alert(json.error || "恢复失败");
      }
    } catch { alert("网络错误"); }
  };

  /** 永久删除离职成员 */
  const handlePermanentDelete = async (m: MemberWithUser) => {
    if (!currentOrg) return;
    if (!confirm(`确定永久删除成员「${m.user?.name}」？此操作不可撤销，删除后无法恢复。`)) return;
    try {
      const res = await fetch("/api/admin/departed", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: currentOrg.id, target_user_id: m.user_id }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (json.success) {
        await loadDeparted();
      } else {
        alert(json.error || "删除失败");
      }
    } catch { alert("网络错误"); }
  };

  /** 暂停/恢复成员 */
  const [suspending, setSuspending] = useState(false);
  const handleSuspendToggle = async () => {
    if (!currentOrg || !selectedMember) return;
    const action = selectedMember.member_status === 'suspended' ? 'restore' : 'suspend';
    const label = action === 'suspend' ? '暂停' : '恢复';
    if (!confirm(`确定${label}成员「${selectedMember.user?.name}」的账号？`)) return;
    setSuspending(true);
    try {
      const res = await fetch("/api/admin/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: currentOrg.id,
          target_user_id: selectedMember.user_id,
          action,
        }),
      });
      const json = (await res.json()) as { success: boolean; data?: MemberWithUser; error?: string };
      if (json.success && json.data) {
        setSelectedMember(json.data);
        setMembers((prev) => prev.map((m) => (m.user_id === json.data!.user_id ? json.data! : m)));
      } else {
        alert(json.error || `${label}失败`);
      }
    } catch { alert('网络错误'); }
    setSuspending(false);
  };

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

  /** 置顶 / 取消置顶成员 */
  const handlePin = async (m: MemberWithUser, pin: boolean) => {
    if (!currentOrg) return;
    try {
      const res = await fetch("/api/admin/members/sort", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: currentOrg.id,
          action: pin ? "pin" : "unpin",
          user_id: m.user_id,
        }),
      });
      const json = (await res.json()) as { success: boolean };
      if (json.success) await loadMembers();
    } catch { /* ignore */ }
  };

  /** 拖拽排序相关 */
  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  const pinnedMembers = useMemo(
    () => filteredMembers.filter((m) => m.sort_order > 0),
    [filteredMembers]
  );

  const handleDragStart = (idx: number) => {
    dragIndex.current = idx;
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    dragOverIndex.current = idx;
  };

  const handleDrop = async () => {
    if (!currentOrg) return;
    const from = dragIndex.current;
    const to = dragOverIndex.current;
    if (from === null || to === null || from === to) return;

    const reordered = [...pinnedMembers];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    // sort_order 越大越靠前，从 N 递减到 1
    const orders = reordered.map((m, i) => ({
      user_id: m.user_id,
      sort_order: reordered.length - i,
    }));

    try {
      const res = await fetch("/api/admin/members/sort", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: currentOrg.id,
          action: "batch",
          orders,
        }),
      });
      const json = (await res.json()) as { success: boolean };
      if (json.success) await loadMembers();
    } catch { /* ignore */ }

    dragIndex.current = null;
    dragOverIndex.current = null;
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
    <div className="flex h-full min-w-0">
      {/* 左侧主内容 */}
      <div className="flex-1 min-w-0">
        {/* 头部 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
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
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium
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
          <button onClick={() => setActiveTab("departed")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5
              ${activeTab === "departed"
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary"}`}>
            已离职
            {departedMembers.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-600 font-semibold">
                {departedMembers.length}
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
                    <th className="text-left px-3 py-2.5 font-medium text-text-secondary hidden md:table-cell">部门 / 职务</th>
                    <th className="text-left px-3 py-2.5 font-medium text-text-secondary hidden lg:table-cell">人员类型</th>
                    <th className="text-left px-3 py-2.5 font-medium text-text-secondary hidden lg:table-cell">手机号</th>
                    <th className="text-left px-3 py-2.5 font-medium text-text-secondary">角色</th>
                    <th className="text-left px-3 py-2.5 font-medium text-text-secondary hidden xl:table-cell">状态</th>
                    <th className="text-left px-3 py-2.5 font-medium text-text-secondary hidden xl:table-cell">加入时间</th>
                    <th className="text-right px-3 py-2.5 font-medium text-text-secondary w-20">排序</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((m) => {
                    const roleConfig = ROLE_CONFIG[m.role];
                    const isSelected = selectedMember?.user_id === m.user_id;
                    const isPinned = m.sort_order > 0;
                    const pinnedIdx = isPinned ? pinnedMembers.indexOf(m) : -1;
                    const userStatus = m.user?.status || "offline";
                    const statusCfg = STATUS_CONFIG[userStatus] || STATUS_CONFIG.offline;
                    return (
                      <tr key={m.user_id}
                        draggable={isPinned}
                        onDragStart={() => handleDragStart(pinnedIdx)}
                        onDragOver={(e) => { if (isPinned) handleDragOver(e, pinnedIdx); }}
                        onDrop={handleDrop}
                        onClick={() => openDetail(m)}
                        className={`border-b border-panel-border last:border-b-0 cursor-pointer transition-colors
                          ${isSelected ? "bg-primary/5" : isPinned ? "bg-amber-50/40 hover:bg-amber-50/70" : "hover:bg-list-hover"}`}>
                        {/* 成员信息：头像（含在线状态）+ 姓名 + 邮箱 + 工号 + 标签 */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {isPinned && (
                              <span className="cursor-grab text-text-placeholder hover:text-text-secondary" title="拖拽排序"
                                onMouseDown={(e) => e.stopPropagation()}>
                                <GripVertical size={14} />
                              </span>
                            )}
                            <div className="relative shrink-0">
                              <Avatar name={m.user?.name || ""} avatarUrl={m.user?.avatar_url} size="sm" />
                              {/* 在线状态指示点 */}
                              {m.member_status !== "suspended" && (
                                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${statusCfg.dot}`}
                                  title={statusCfg.label} />
                              )}
                              {m.member_status === "suspended" && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                                  <ShieldOff size={7} className="text-white" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium text-text-primary truncate">{m.user?.name}</p>
                                {m.employee_id && (
                                  <span className="shrink-0 text-[10px] text-text-placeholder font-mono">#{m.employee_id}</span>
                                )}
                                {isPinned && (
                                  <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-100 text-amber-700">
                                    <Pin size={8} /> 置顶
                                  </span>
                                )}
                                {m.member_status === "suspended" && (
                                  <span className="shrink-0 inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-100 text-red-600">暂停</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-xs text-text-placeholder truncate">{m.user?.email}</p>
                                {m.work_city && (
                                  <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] text-text-placeholder">
                                    <MapPin size={9} />{m.work_city}
                                  </span>
                                )}
                              </div>
                              {/* 状态签名 */}
                              {m.user?.status_text && (
                                <p className="text-[10px] text-text-placeholder truncate mt-0.5">
                                  {m.user.status_emoji && <span className="mr-0.5">{m.user.status_emoji}</span>}
                                  {m.user.status_text}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* 部门 / 职务 合并列 */}
                        <td className="px-3 py-3 hidden md:table-cell">
                          <div className="min-w-0">
                            <p className="text-sm text-text-secondary truncate">{m.department || "—"}</p>
                            {m.title && (
                              <p className="text-xs text-text-placeholder truncate mt-0.5">{m.title}</p>
                            )}
                          </div>
                        </td>
                        {/* 人员类型 */}
                        <td className="px-3 py-3 hidden lg:table-cell">
                          {m.employee_type ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-50 text-violet-600 border border-violet-100">
                              {m.employee_type}
                            </span>
                          ) : (
                            <span className="text-xs text-text-placeholder">—</span>
                          )}
                        </td>
                        {/* 手机号 */}
                        <td className="px-3 py-3 hidden lg:table-cell">
                          {m.phone ? (
                            <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                              <Phone size={11} className="text-text-placeholder" />{m.phone}
                            </span>
                          ) : (
                            <span className="text-xs text-text-placeholder">—</span>
                          )}
                        </td>
                        {/* 角色 */}
                        <td className="px-3 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${roleConfig.badge}`}>
                            {roleConfig.label}
                          </span>
                        </td>
                        {/* 在线状态 + 性别 */}
                        <td className="px-3 py-3 hidden xl:table-cell">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusCfg.dot}`} />
                              {statusCfg.label}
                            </span>
                            {m.gender && (
                              <span className="text-[10px] text-text-placeholder">
                                {m.gender === "male" ? "男" : "女"}
                              </span>
                            )}
                          </div>
                        </td>
                        {/* 加入时间 */}
                        <td className="px-3 py-3 hidden xl:table-cell">
                          <span className="text-xs text-text-placeholder">{new Date(m.joined_at).toLocaleDateString("zh-CN")}</span>
                        </td>
                        {/* 排序 */}
                        <td className="px-3 py-3 text-right">
                          {m.role !== "owner" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePin(m, !isPinned); }}
                              title={isPinned ? "取消置顶" : "置顶"}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors
                                ${isPinned
                                  ? "text-amber-600 bg-amber-50 hover:bg-amber-100"
                                  : "text-text-secondary hover:bg-list-hover hover:text-primary"}`}>
                              {isPinned ? <><PinOff size={12} /> 取消</> : <><Pin size={12} /> 置顶</>}
                            </button>
                          )}
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

        {/* 已离职 Tab */}
        {activeTab === "departed" && (
          <DepartedPanel
            members={departedMembers}
            loading={departedLoading}
            onRestore={handleRestoreDeparted}
            onDelete={handlePermanentDelete}
          />
        )}
      </div>

      {/* 右侧：成员详情抽屉（固定定位） */}
      {selectedMember && activeTab === "members" && (
        <>
          <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setSelectedMember(null)} />
          <MemberDetailPanel
            member={selectedMember}
            isOwner={selectedMember.role === "owner"}
            isSelf={selectedMember.user_id === user?.id}
            editing={editing}
            saving={saving}
            departments={departments}
            employeeTypes={employeeTypes}
            editName={editName} setEditName={setEditName}
            editDept={editDept} setEditDept={setEditDept}
            editTitle={editTitle} setEditTitle={setEditTitle}
            editEmployeeId={editEmployeeId} setEditEmployeeId={setEditEmployeeId}
            editPhone={editPhone} setEditPhone={setEditPhone}
            editWorkCity={editWorkCity} setEditWorkCity={setEditWorkCity}
            editGender={editGender} setEditGender={setEditGender}
            editEmployeeType={editEmployeeType} setEditEmployeeType={setEditEmployeeType}
            editEmail={editEmail} setEditEmail={setEditEmail}
            editLoginPhone={editLoginPhone} setEditLoginPhone={setEditLoginPhone}
            editRole={editRole} setEditRole={setEditRole}
            onEdit={() => { setEditing(true); setSaveError(""); }}
            onCancel={() => { setEditing(false); setSaveError(""); populateForm(selectedMember); }}
            onSave={handleSave}
            saveError={saveError}
            onSuspend={handleSuspendToggle}
            suspending={suspending}
            onDepart={() => openDepartModal(selectedMember)}
            onRemove={() => handleRemove(selectedMember)}
            onClose={() => setSelectedMember(null)}
          />
        </>
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

      {showDepartModal && departTarget && (
        <DepartModal
          target={departTarget}
          members={members}
          receiverId={departReceiverId}
          setReceiverId={setDepartReceiverId}
          transferDocs={transferDocs}
          setTransferDocs={setTransferDocs}
          transferEvents={transferEvents}
          setTransferEvents={setTransferEvents}
          transferConversations={transferConversations}
          setTransferConversations={setTransferConversations}
          departing={departing}
          onConfirm={handleDepart}
          onCancel={() => setShowDepartModal(false)}
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
  employeeTypes: EmployeeType[];
  editName: string; setEditName: (v: string) => void;
  editDept: string; setEditDept: (v: string) => void;
  editTitle: string; setEditTitle: (v: string) => void;
  editEmployeeId: string; setEditEmployeeId: (v: string) => void;
  editPhone: string; setEditPhone: (v: string) => void;
  editWorkCity: string; setEditWorkCity: (v: string) => void;
  editGender: Gender | ""; setEditGender: (v: Gender | "") => void;
  editEmployeeType: string; setEditEmployeeType: (v: string) => void;
  editEmail: string; setEditEmail: (v: string) => void;
  editLoginPhone: string; setEditLoginPhone: (v: string) => void;
  editRole: OrgMemberRole; setEditRole: (v: OrgMemberRole) => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saveError?: string;
  onSuspend: () => void;
  suspending?: boolean;
  onDepart: () => void;
  onRemove: () => void;
  onClose: () => void;
}

function MemberDetailPanel({
  member, isOwner, isSelf, editing, saving, departments, employeeTypes,
  editName, setEditName, editDept, setEditDept,
  editTitle, setEditTitle, editEmployeeId, setEditEmployeeId,
  editPhone, setEditPhone, editWorkCity, setEditWorkCity,
  editGender, setEditGender, editEmployeeType, setEditEmployeeType,
  editEmail, setEditEmail, editLoginPhone, setEditLoginPhone,
  editRole, setEditRole,
  onEdit, onCancel, onSave, saveError, onSuspend, suspending, onDepart, onRemove, onClose,
}: DetailPanelProps) {
  const roleConfig = ROLE_CONFIG[member.role];
  return (
    <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-panel-bg shadow-2xl z-40 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
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
            {member.member_status === "suspended" ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-600">
                <ShieldOff size={10} /> 暂停使用
              </span>
            ) : member.user?.status === "online" ? (
              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> 在线
              </span>
            ) : null}
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
              <EditRow icon={<Tag size={14} />} label="人员类型">
                <select value={editEmployeeType} onChange={(e) => setEditEmployeeType(e.target.value)}
                  className="flex-1 h-8 px-2 rounded-md border border-panel-border text-xs bg-bg-page outline-none">
                  <option value="">未设置</option>
                  {employeeTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              </EditRow>
            ) : (
              <InfoRow icon={<Tag size={14} />} label="人员类型" value={member.employee_type || "未设置"} />
            )}
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

        {/* 登录方式 */}
        <div className="px-5 py-4 border-b border-panel-border">
          <h5 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <KeyRound size={12} /> 登录方式
          </h5>
          <div className="space-y-3">
            {editing ? (
              <EditRow icon={<Mail size={14} />} label="登录邮箱">
                <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="登录邮箱"
                  type="email"
                  className="flex-1 h-8 px-2 rounded-md border border-panel-border text-xs bg-bg-page outline-none" />
              </EditRow>
            ) : (
              <InfoRow icon={<Mail size={14} />} label="登录邮箱" value={member.user?.email || ""} />
            )}
            {editing ? (
              <EditRow icon={<Smartphone size={14} />} label="登录手机">
                <input value={editLoginPhone} onChange={(e) => setEditLoginPhone(e.target.value)} placeholder="手机号码（选填）"
                  type="tel"
                  className="flex-1 h-8 px-2 rounded-md border border-panel-border text-xs bg-bg-page outline-none" />
              </EditRow>
            ) : (
              <InfoRow icon={<Smartphone size={14} />} label="登录手机" value={member.user?.login_phone || "未绑定"} />
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-panel-border shrink-0">
        {editing ? (
          <div className="space-y-2">
            {saveError && (
              <p className="text-xs text-red-500 text-center">{saveError}</p>
            )}
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
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button onClick={onEdit}
                className="flex-1 h-8 rounded-lg bg-primary text-white text-sm font-medium
                  hover:bg-primary/90 transition-colors flex items-center justify-center gap-1">
                <Pencil size={13} /> 编辑信息
              </button>
              {!isOwner && !isSelf && (
                <button onClick={onDepart}
                  className="h-8 px-3 rounded-lg border border-red-200 text-sm text-red-500
                    hover:bg-red-50 transition-colors flex items-center gap-1">
                  <LogOut size={13} /> 离职
                </button>
              )}
            </div>
            {!isOwner && !isSelf && (
              <button onClick={onSuspend} disabled={suspending}
                className={`w-full h-8 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-1
                  ${member.member_status === 'suspended'
                    ? 'border-green-200 text-green-600 hover:bg-green-50'
                    : 'border-amber-200 text-amber-600 hover:bg-amber-50'
                  } disabled:opacity-50`}>
                {suspending ? <Loader2 size={13} className="animate-spin" /> :
                  member.member_status === 'suspended' ? <><Play size={13} /> 恢复账号</> : <><Pause size={13} /> 暂停账号</>
                }
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

/* ========== 已离职成员列表 ========== */
function DepartedPanel({
  members, loading, onRestore, onDelete,
}: {
  members: MemberWithUser[];
  loading: boolean;
  onRestore: (m: MemberWithUser) => void;
  onDelete: (m: MemberWithUser) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-text-placeholder" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="bg-panel-bg rounded-xl border border-panel-border p-12 text-center">
        <UserX size={36} className="mx-auto mb-3 text-text-placeholder opacity-40" />
        <p className="text-sm text-text-secondary">暂无已离职成员</p>
      </div>
    );
  }

  return (
    <div className="bg-panel-bg rounded-xl border border-panel-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-panel-border bg-bg-page/50">
            <th className="text-left px-4 py-2.5 font-medium text-text-secondary">成员</th>
            <th className="text-left px-3 py-2.5 font-medium text-text-secondary hidden md:table-cell">部门</th>
            <th className="text-left px-3 py-2.5 font-medium text-text-secondary hidden lg:table-cell">离职日期</th>
            <th className="text-left px-3 py-2.5 font-medium text-text-secondary hidden lg:table-cell">资源接收人</th>
            <th className="text-right px-4 py-2.5 font-medium text-text-secondary">操作</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => {
            const canRestore = m.departed_at
              ? (Date.now() - new Date(m.departed_at).getTime()) / (1000 * 60 * 60 * 24) <= 30
              : false;

            return (
              <tr key={m.user_id} className="border-b border-panel-border last:border-b-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative opacity-60">
                      <Avatar name={m.user?.name || ""} avatarUrl={m.user?.avatar_url} size="sm" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-text-secondary truncate">{m.user?.name}</p>
                        <span className="shrink-0 inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-500">已离职</span>
                      </div>
                      <p className="text-xs text-text-placeholder truncate">{m.user?.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 hidden md:table-cell">
                  <span className="text-sm text-text-secondary">{m.department || "—"}</span>
                </td>
                <td className="px-3 py-3 hidden lg:table-cell">
                  <span className="text-xs text-text-placeholder">
                    {m.departed_at ? new Date(m.departed_at).toLocaleDateString("zh-CN") : "—"}
                  </span>
                </td>
                <td className="px-3 py-3 hidden lg:table-cell">
                  <span className="text-xs text-text-placeholder">
                    {m.receiver?.name || "未转移"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {canRestore && (
                      <button onClick={() => onRestore(m)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-green-600 bg-green-50 rounded hover:bg-green-100 transition-colors">
                        <RotateCcw size={11} /> 恢复
                      </button>
                    )}
                    <button onClick={() => onDelete(m)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-500 bg-red-50 rounded hover:bg-red-100 transition-colors">
                      <Trash2 size={11} /> 删除
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ========== 离职确认弹窗 ========== */
function DepartModal({
  target, members, receiverId, setReceiverId,
  transferDocs, setTransferDocs,
  transferEvents, setTransferEvents,
  transferConversations, setTransferConversations,
  departing, onConfirm, onCancel,
}: {
  target: MemberWithUser;
  members: MemberWithUser[];
  receiverId: string; setReceiverId: (v: string) => void;
  transferDocs: boolean; setTransferDocs: (v: boolean) => void;
  transferEvents: boolean; setTransferEvents: (v: boolean) => void;
  transferConversations: boolean; setTransferConversations: (v: boolean) => void;
  departing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const availableReceivers = members.filter(
    (m) => m.user_id !== target.user_id && m.member_status !== 'departed'
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-bg-panel rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-panel-border flex items-center justify-between">
          <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <LogOut size={18} className="text-red-500" /> 操作离职
          </h3>
          <button onClick={onCancel} className="w-7 h-7 rounded-md flex items-center justify-center text-text-placeholder hover:bg-list-hover">
            <X size={14} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* 离职成员信息 */}
          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
            <Avatar name={target.user?.name || ""} avatarUrl={target.user?.avatar_url} size="sm" />
            <div>
              <p className="text-sm font-medium text-text-primary">{target.user?.name}</p>
              <p className="text-xs text-text-placeholder">{target.user?.email}</p>
            </div>
          </div>

          {/* 资源接收人 */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">资源接收人</label>
            <select value={receiverId} onChange={(e) => setReceiverId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-panel-border text-sm bg-bg-page outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">不转移资源（保留在成员名下）</option>
              {availableReceivers.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.user?.name}（{m.user?.email}）</option>
              ))}
            </select>
          </div>

          {/* 资源转移选项 */}
          {receiverId && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">选择要转移的资源</label>
              <div className="space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={transferDocs} onChange={(e) => setTransferDocs(e.target.checked)}
                    className="rounded border-panel-border text-primary" />
                  <span className="text-sm text-text-secondary">云文档 — 转移该成员创建的所有文档</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={transferEvents} onChange={(e) => setTransferEvents(e.target.checked)}
                    className="rounded border-panel-border text-primary" />
                  <span className="text-sm text-text-secondary">未来日程 — 转移该成员创建的未来日程</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={transferConversations} onChange={(e) => setTransferConversations(e.target.checked)}
                    className="rounded border-panel-border text-primary" />
                  <span className="text-sm text-text-secondary">群聊 — 转移该成员创建的群聊管理权</span>
                </label>
              </div>
            </div>
          )}

          {/* 风险提示 */}
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-xs text-amber-700 space-y-1">
            <p className="font-semibold">⚠️ 注意</p>
            <p>• 操作离职后，该成员将无法访问本企业</p>
            <p>• 资源转移后不可撤销，请谨慎操作</p>
            <p>• 离职 30 天内可恢复成员，但已转移资源无法恢复</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-panel-border flex gap-3">
          <button onClick={onCancel}
            className="flex-1 h-9 rounded-lg border border-panel-border text-sm text-text-secondary hover:bg-list-hover transition-colors">
            取消
          </button>
          <button onClick={onConfirm} disabled={departing}
            className="flex-1 h-9 rounded-lg bg-red-500 text-white text-sm font-medium
              hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-1">
            {departing ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
            确认离职
          </button>
        </div>
      </div>
    </div>
  );
}
