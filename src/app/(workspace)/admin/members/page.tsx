/**
 * 管理后台 - 成员管理（增强版，参照飞书成员管理）
 * 支持：成员列表 + 搜索筛选 + 详情侧栏 + 编辑基本/工作信息
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search, Loader2, Users, ChevronDown,
  X, Pencil, Trash2, Shield, Phone,
  Mail, Building2, Briefcase, Hash,
  MapPin, User2, Calendar, Check,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import type { OrgMember, OrgMemberRole, User, Gender } from "@/lib/types";

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

export default function AdminMembersPage() {
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  const [members, setMembers] = useState<MemberWithUser[]>([]);
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

  useEffect(() => { loadMembers(); }, [loadMembers]);

  /** 获取不重复的部门列表 */
  const departments = useMemo(() => {
    const depts = new Set<string>();
    members.forEach((m) => { if (m.department) depts.add(m.department); });
    return Array.from(depts).sort();
  }, [members]);

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

  /** 填充编辑表单 */
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

      // 对比变化，仅发送修改的字段
      if (editName.trim() !== (selectedMember.user?.name || ""))
        payload.name = editName.trim();
      if (editDept !== (selectedMember.department || ""))
        payload.department = editDept || null;
      if (editTitle !== (selectedMember.title || ""))
        payload.title = editTitle || null;
      if (editEmployeeId !== (selectedMember.employee_id || ""))
        payload.employee_id = editEmployeeId || null;
      if (editPhone !== (selectedMember.phone || ""))
        payload.phone = editPhone || null;
      if (editWorkCity !== (selectedMember.work_city || ""))
        payload.work_city = editWorkCity || null;
      if (editGender !== (selectedMember.gender || ""))
        payload.gender = editGender || null;
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
        // 更新列表和选中
        if (json.data) {
          setSelectedMember(json.data);
          setMembers((prev) =>
            prev.map((m) => (m.user_id === json.data!.user_id ? json.data! : m))
          );
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* 左侧：成员列表 */}
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
              {filterDept && ` · 筛选：${filterDept}`}
            </p>
          </div>
        </div>

        {/* 搜索 + 筛选 */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-placeholder" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索姓名、邮箱、部门、职务、工号、手机号…"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-panel-border text-sm bg-bg-page
                text-text-primary placeholder:text-text-placeholder outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {/* 部门筛选 */}
          {departments.length > 0 && (
            <div className="relative">
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="h-9 pl-3 pr-8 rounded-lg border border-panel-border text-sm bg-bg-page
                  text-text-primary outline-none appearance-none cursor-pointer"
              >
                <option value="">全部部门</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-placeholder pointer-events-none" />
            </div>
          )}
        </div>

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
                  <tr
                    key={m.user_id}
                    onClick={() => openDetail(m)}
                    className={`border-b border-panel-border last:border-b-0 cursor-pointer transition-colors
                      ${isSelected ? "bg-primary/5" : "hover:bg-list-hover"}`}
                  >
                    {/* 成员信息 */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={m.user?.name || ""} avatarUrl={m.user?.avatar_url} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{m.user?.name}</p>
                          <p className="text-xs text-text-placeholder truncate">{m.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* 部门 */}
                    <td className="px-3 py-3 hidden md:table-cell">
                      <span className="text-sm text-text-secondary">{m.department || "—"}</span>
                    </td>
                    {/* 职务 */}
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <span className="text-sm text-text-secondary">{m.title || "—"}</span>
                    </td>
                    {/* 工号 */}
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <span className="text-xs text-text-placeholder font-mono">{m.employee_id || "—"}</span>
                    </td>
                    {/* 角色 */}
                    <td className="px-3 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${roleConfig.badge}`}>
                        {roleConfig.label}
                      </span>
                    </td>
                    {/* 加入时间 */}
                    <td className="px-3 py-3 hidden xl:table-cell">
                      <span className="text-xs text-text-placeholder">
                        {new Date(m.joined_at).toLocaleDateString("zh-CN")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredMembers.length === 0 && (
            <div className="py-12 text-center">
              <Users size={32} className="mx-auto mb-2 text-text-placeholder opacity-40" />
              <p className="text-sm text-text-secondary">
                {search ? "没有匹配的成员" : "暂无成员"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 右侧：成员详情侧栏 */}
      {selectedMember && (
        <MemberDetailPanel
          member={selectedMember}
          isOwner={selectedMember.role === "owner"}
          isSelf={selectedMember.user_id === user?.id}
          editing={editing}
          saving={saving}
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
  member, isOwner, isSelf, editing, saving,
  editName, setEditName, editDept, setEditDept,
  editTitle, setEditTitle, editEmployeeId, setEditEmployeeId,
  editPhone, setEditPhone, editWorkCity, setEditWorkCity,
  editGender, setEditGender, editRole, setEditRole,
  onEdit, onCancel, onSave, onRemove, onClose,
}: DetailPanelProps) {
  const roleConfig = ROLE_CONFIG[member.role];

  return (
    <div className="w-80 xl:w-96 border-l border-panel-border bg-panel-bg shrink-0 flex flex-col h-full overflow-hidden ml-0">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border">
        <h3 className="text-sm font-semibold text-text-primary">成员详情</h3>
        <div className="flex items-center gap-1">
          {!editing && (
            <button onClick={onEdit}
              className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:bg-list-hover"
              title="编辑">
              <Pencil size={14} />
            </button>
          )}
          <button onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-text-placeholder hover:bg-list-hover">
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
              className="w-full h-9 px-3 rounded-lg border border-panel-border text-sm text-center bg-bg-page
                outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="成员姓名" />
          ) : (
            <h4 className="text-lg font-semibold text-text-primary">{member.user?.name}</h4>
          )}
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${roleConfig.badge}`}>
              {roleConfig.label}
            </span>
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
                <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="手机号码"
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
                <input value={editDept} onChange={(e) => setEditDept(e.target.value)}
                  placeholder="所属部门"
                  className="flex-1 h-8 px-2 rounded-md border border-panel-border text-xs bg-bg-page outline-none" />
              </EditRow>
            ) : (
              <InfoRow icon={<Building2 size={14} />} label="部门" value={member.department || "未分配"} />
            )}

            {editing ? (
              <EditRow icon={<Briefcase size={14} />} label="职务">
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="职务/头衔"
                  className="flex-1 h-8 px-2 rounded-md border border-panel-border text-xs bg-bg-page outline-none" />
              </EditRow>
            ) : (
              <InfoRow icon={<Briefcase size={14} />} label="职务" value={member.title || "未设置"} />
            )}

            {editing ? (
              <EditRow icon={<Hash size={14} />} label="工号">
                <input value={editEmployeeId} onChange={(e) => setEditEmployeeId(e.target.value)}
                  placeholder="员工工号"
                  className="flex-1 h-8 px-2 rounded-md border border-panel-border text-xs bg-bg-page outline-none" />
              </EditRow>
            ) : (
              <InfoRow icon={<Hash size={14} />} label="工号" value={member.employee_id || "未设置"} />
            )}

            {editing ? (
              <EditRow icon={<MapPin size={14} />} label="工作城市">
                <input value={editWorkCity} onChange={(e) => setEditWorkCity(e.target.value)}
                  placeholder="工作城市"
                  className="flex-1 h-8 px-2 rounded-md border border-panel-border text-xs bg-bg-page outline-none" />
              </EditRow>
            ) : (
              <InfoRow icon={<MapPin size={14} />} label="工作城市" value={member.work_city || "未设置"} />
            )}

            {/* 角色 */}
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

      {/* 底部操作 */}
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

/* ========== 信息行（展示模式） ========== */
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-text-placeholder shrink-0">{icon}</span>
      <span className="text-text-secondary w-14 shrink-0">{label}</span>
      <span className="text-text-primary truncate flex-1">{value}</span>
    </div>
  );
}

/* ========== 编辑行（编辑模式） ========== */
function EditRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-text-placeholder shrink-0">{icon}</span>
      <span className="text-text-secondary w-14 shrink-0">{label}</span>
      {children}
    </div>
  );
}
