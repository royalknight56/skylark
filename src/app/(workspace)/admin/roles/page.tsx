/**
 * 管理后台 - 管理员权限（角色管理）
 * 支持创建角色、分配权限、管理成员
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2, Shield, Plus, X, Pencil, Trash2,
  Users, ChevronRight, Check, UserPlus, UserMinus,
  Search, ShieldCheck,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useOrg } from "@/lib/org-context";
import type { AdminRole, AdminRoleMember, AdminPermission, OrgMember, User } from "@/lib/types";
import { ADMIN_PERMISSION_META, ALL_ADMIN_PERMISSIONS } from "@/lib/types";

type RoleWithMembers = AdminRole & { members?: AdminRoleMember[] };

export default function AdminRolesPage() {
  const { currentOrg } = useOrg();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);

  // 详情面板
  const [selectedRole, setSelectedRole] = useState<RoleWithMembers | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<"perms" | "members">("perms");

  // 创建/编辑弹窗
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formParent, setFormParent] = useState("");
  const [formPerms, setFormPerms] = useState<Set<AdminPermission>>(new Set());
  const [formDelegate, setFormDelegate] = useState(false);
  const [formSaving, setFormSaving] = useState(false);

  // 添加管理员
  const [showAddMember, setShowAddMember] = useState(false);
  const [orgMembers, setOrgMembers] = useState<(OrgMember & { user: User })[]>([]);
  const [memberSearch, setMemberSearch] = useState("");

  /** 加载角色列表 */
  const loadRoles = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/roles?org_id=${currentOrg.id}`);
      const json = (await res.json()) as { success: boolean; data?: AdminRole[] };
      if (json.success && json.data) setRoles(json.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [currentOrg]);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  /** 加载角色详情（含成员） */
  const loadRoleDetail = useCallback(async (roleId: string) => {
    if (!currentOrg) return;
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/roles?org_id=${currentOrg.id}&role_id=${roleId}`);
      const json = (await res.json()) as { success: boolean; data?: RoleWithMembers };
      if (json.success && json.data) setSelectedRole(json.data);
    } catch { /* ignore */ }
    setDetailLoading(false);
  }, [currentOrg]);

  /** 打开创建弹窗 */
  const openCreateModal = () => {
    setEditingRole(null);
    setFormName("");
    setFormDesc("");
    setFormParent("");
    setFormPerms(new Set());
    setFormDelegate(false);
    setShowModal(true);
  };

  /** 打开编辑弹窗 */
  const openEditModal = (role: AdminRole) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormDesc(role.description || "");
    setFormParent(role.parent_role_id || "");
    setFormPerms(new Set(role.permissions));
    setFormDelegate(role.can_delegate);
    setShowModal(true);
  };

  /** 切换权限 */
  const togglePerm = (p: AdminPermission) => {
    setFormPerms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });
  };

  /** 保存角色（创建或编辑） */
  const handleSaveRole = async () => {
    if (!currentOrg || !formName.trim()) return;
    setFormSaving(true);
    try {
      if (editingRole) {
        const res = await fetch("/api/admin/roles", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            org_id: currentOrg.id,
            role_id: editingRole.id,
            name: formName.trim(),
            description: formDesc.trim() || null,
            permissions: Array.from(formPerms),
            can_delegate: formDelegate,
          }),
        });
        const json = (await res.json()) as { success: boolean; error?: string };
        if (json.success) {
          setShowModal(false);
          await loadRoles();
          if (selectedRole?.id === editingRole.id) await loadRoleDetail(editingRole.id);
        } else {
          alert(json.error || "保存失败");
        }
      } else {
        const res = await fetch("/api/admin/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            org_id: currentOrg.id,
            name: formName.trim(),
            description: formDesc.trim() || undefined,
            parent_role_id: formParent || undefined,
            permissions: Array.from(formPerms),
            can_delegate: formDelegate,
          }),
        });
        const json = (await res.json()) as { success: boolean; data?: AdminRole; error?: string };
        if (json.success) {
          setShowModal(false);
          await loadRoles();
        } else {
          alert(json.error || "创建失败");
        }
      }
    } catch { alert("网络错误"); }
    setFormSaving(false);
  };

  /** 删除角色 */
  const handleDeleteRole = async (role: AdminRole) => {
    if (!currentOrg) return;
    if (!confirm(`确定删除管理员角色「${role.name}」？该角色下的管理员将失去对应权限。`)) return;
    try {
      const res = await fetch("/api/admin/roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: currentOrg.id, role_id: role.id }),
      });
      const json = (await res.json()) as { success: boolean };
      if (json.success) {
        if (selectedRole?.id === role.id) setSelectedRole(null);
        await loadRoles();
      }
    } catch { alert("网络错误"); }
  };

  /** 加载企业成员（用于添加管理员） */
  const loadOrgMembers = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const res = await fetch(`/api/admin/members?org_id=${currentOrg.id}`);
      const json = (await res.json()) as { success: boolean; data?: (OrgMember & { user: User })[] };
      if (json.success && json.data) setOrgMembers(json.data);
    } catch { /* ignore */ }
  }, [currentOrg]);

  /** 添加管理员到角色 */
  const handleAddMember = async (userId: string) => {
    if (!currentOrg || !selectedRole) return;
    try {
      const res = await fetch("/api/admin/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: currentOrg.id,
          role_id: selectedRole.id,
          action: "add",
          user_id: userId,
        }),
      });
      const json = (await res.json()) as { success: boolean; data?: AdminRoleMember[] };
      if (json.success && json.data) {
        setSelectedRole({ ...selectedRole, members: json.data });
        await loadRoles();
      }
    } catch { alert("网络错误"); }
  };

  /** 从角色移除管理员 */
  const handleRemoveMember = async (userId: string) => {
    if (!currentOrg || !selectedRole) return;
    if (!confirm("确定移除该管理员？")) return;
    try {
      const res = await fetch("/api/admin/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: currentOrg.id,
          role_id: selectedRole.id,
          action: "remove",
          user_id: userId,
        }),
      });
      const json = (await res.json()) as { success: boolean; data?: AdminRoleMember[] };
      if (json.success && json.data) {
        setSelectedRole({ ...selectedRole, members: json.data });
        await loadRoles();
      }
    } catch { alert("网络错误"); }
  };

  /** 已在角色中的成员 ID 集合 */
  const existingMemberIds = new Set(selectedRole?.members?.map((m) => m.user_id) || []);

  /** 可选的成员（排除已添加的和 owner） */
  const filteredOrgMembers = orgMembers.filter((m) => {
    if (existingMemberIds.has(m.user_id)) return false;
    if (m.role === "owner") return false;
    if (!memberSearch.trim()) return true;
    const q = memberSearch.toLowerCase();
    return m.user?.name?.toLowerCase().includes(q) || m.user?.email?.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 lg:gap-6">
      {/* 左侧：角色列表 */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <Shield size={22} className="text-primary" />
              管理员权限
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              创建管理员角色，为每个角色分配不同的管理权限
            </p>
          </div>
          <button onClick={openCreateModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium
              hover:bg-primary/90 transition-colors">
            <Plus size={16} /> 创建角色
          </button>
        </div>

        {/* 超级管理员说明 */}
        <div className="mb-4 px-4 py-3 bg-amber-50 rounded-lg border border-amber-100">
          <p className="text-xs text-amber-700">
            <strong>创建人（超级管理员）</strong>拥有管理后台全部权限，无需额外配置。
            如需让其他成员成为管理员，请创建管理员角色并添加成员。
          </p>
        </div>

        {/* 角色列表 */}
        {roles.length === 0 ? (
          <div className="bg-panel-bg rounded-xl border border-panel-border p-12 text-center">
            <ShieldCheck size={40} className="mx-auto mb-3 text-text-placeholder opacity-40" />
            <p className="text-sm text-text-secondary mb-1">暂无自定义管理员角色</p>
            <p className="text-xs text-text-placeholder mb-4">创建角色后可为不同管理员分配不同权限</p>
            <button onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm
                hover:bg-primary/90 transition-colors">
              <Plus size={14} /> 创建角色
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {roles.map((role) => {
              const isSelected = selectedRole?.id === role.id;
              return (
                <div key={role.id}
                  onClick={() => loadRoleDetail(role.id)}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-xl border cursor-pointer transition-colors
                    ${isSelected
                      ? "bg-primary/5 border-primary/30"
                      : "bg-panel-bg border-panel-border hover:bg-list-hover"
                    }`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Shield size={18} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{role.name}</p>
                      <p className="text-xs text-text-placeholder mt-0.5">
                        {role.permissions.length} 项权限
                        {role.parent_name && ` · 上级: ${role.parent_name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="inline-flex items-center gap-1 text-xs text-text-placeholder">
                      <Users size={12} /> {role.member_count ?? 0}
                    </span>
                    <ChevronRight size={14} className="text-text-placeholder" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 右侧：角色详情 */}
      {selectedRole && (
        <div className="w-full lg:w-96 bg-panel-bg border border-panel-border rounded-xl flex flex-col shrink-0 overflow-hidden">
          {detailLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={24} className="text-primary animate-spin" />
            </div>
          ) : (
            <>
              {/* 头部 */}
              <div className="px-5 py-4 border-b border-panel-border">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-text-primary truncate">{selectedRole.name}</h3>
                    {selectedRole.description && (
                      <p className="text-xs text-text-placeholder mt-1">{selectedRole.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEditModal(selectedRole)} title="编辑"
                      className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:bg-list-hover">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDeleteRole(selectedRole)} title="删除"
                      className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:bg-red-50 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                    <button onClick={() => setSelectedRole(null)} title="关闭"
                      className="w-7 h-7 rounded-md flex items-center justify-center text-text-placeholder hover:bg-list-hover">
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Tab */}
                <div className="flex gap-1 mt-3 -mb-px">
                  <button onClick={() => setActiveDetailTab("perms")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-t-md border-b-2 transition-colors
                      ${activeDetailTab === "perms"
                        ? "border-primary text-primary"
                        : "border-transparent text-text-secondary hover:text-text-primary"}`}>
                    权限
                  </button>
                  <button onClick={() => setActiveDetailTab("members")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-t-md border-b-2 transition-colors flex items-center gap-1
                      ${activeDetailTab === "members"
                        ? "border-primary text-primary"
                        : "border-transparent text-text-secondary hover:text-text-primary"}`}>
                    成员
                    <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-600">
                      {selectedRole.members?.length ?? selectedRole.member_count ?? 0}
                    </span>
                  </button>
                </div>
              </div>

              {/* 内容 */}
              <div className="flex-1 overflow-y-auto">
                {activeDetailTab === "perms" && (
                  <div className="px-5 py-4 space-y-2">
                    {ALL_ADMIN_PERMISSIONS.map((p) => {
                      const meta = ADMIN_PERMISSION_META[p];
                      const has = selectedRole.permissions.includes(p);
                      return (
                        <div key={p}
                          className={`px-3 py-2.5 rounded-lg border ${
                            has ? "bg-primary/5 border-primary/20" : "bg-bg-page border-panel-border opacity-40"
                          }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-text-primary">{meta.label}</span>
                            {has && <Check size={14} className="text-primary" />}
                          </div>
                          <p className="text-[11px] text-text-placeholder mt-0.5">{meta.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeDetailTab === "members" && (
                  <div className="px-5 py-4">
                    <button onClick={() => { setShowAddMember(true); loadOrgMembers(); setMemberSearch(""); }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 mb-3 border border-dashed border-panel-border
                        rounded-lg text-xs text-text-secondary hover:bg-list-hover hover:text-primary transition-colors">
                      <UserPlus size={13} /> 添加管理员
                    </button>

                    {(!selectedRole.members || selectedRole.members.length === 0) ? (
                      <p className="text-xs text-text-placeholder text-center py-6">暂无成员</p>
                    ) : (
                      <div className="space-y-1.5">
                        {selectedRole.members.map((m) => (
                          <div key={m.user_id}
                            className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-list-hover">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar name={m.user?.name || ""} avatarUrl={m.user?.avatar_url} size="sm" />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-text-primary truncate">{m.user?.name}</p>
                                <p className="text-[10px] text-text-placeholder truncate">{m.user?.email}</p>
                              </div>
                            </div>
                            <button onClick={() => handleRemoveMember(m.user_id)} title="移除"
                              className="w-6 h-6 rounded-md flex items-center justify-center text-text-placeholder
                                hover:bg-red-50 hover:text-red-500 shrink-0">
                              <UserMinus size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* 创建/编辑角色弹窗 */}
      {showModal && (
        <RoleFormModal
          editing={!!editingRole}
          roles={roles}
          name={formName} setName={setFormName}
          desc={formDesc} setDesc={setFormDesc}
          parentId={formParent} setParentId={setFormParent}
          perms={formPerms} togglePerm={togglePerm}
          delegate={formDelegate} setDelegate={setFormDelegate}
          saving={formSaving}
          onSave={handleSaveRole}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* 添加管理员弹窗 */}
      {showAddMember && selectedRole && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowAddMember(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-panel-bg rounded-2xl shadow-2xl border border-panel-border z-50 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-panel-border">
              <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <UserPlus size={18} className="text-primary" /> 添加管理员到「{selectedRole.name}」
              </h3>
              <button onClick={() => setShowAddMember(false)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-text-placeholder hover:bg-list-hover">
                <X size={14} />
              </button>
            </div>

            <div className="px-5 py-3">
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-placeholder" />
                <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="搜索成员…"
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-panel-border text-sm bg-bg-page
                    text-text-primary outline-none focus:ring-2 focus:ring-primary/30" />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1">
                {filteredOrgMembers.length === 0 ? (
                  <p className="text-xs text-text-placeholder text-center py-6">无可添加的成员</p>
                ) : (
                  filteredOrgMembers.map((m) => (
                    <div key={m.user_id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-list-hover">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={m.user?.name || ""} avatarUrl={m.user?.avatar_url} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-text-primary truncate">{m.user?.name}</p>
                          <p className="text-[10px] text-text-placeholder truncate">{m.user?.email}</p>
                        </div>
                      </div>
                      <button onClick={() => { handleAddMember(m.user_id); }}
                        className="px-2.5 py-1 rounded-md text-xs text-primary bg-primary/10 hover:bg-primary/20 transition-colors">
                        添加
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="px-5 py-3 border-t border-panel-border flex justify-end">
              <button onClick={() => setShowAddMember(false)}
                className="px-4 py-2 text-sm text-text-secondary hover:bg-list-hover rounded-lg transition-colors">
                完成
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ========== 角色创建/编辑弹窗 ========== */
function RoleFormModal({
  editing, roles,
  name, setName, desc, setDesc,
  parentId, setParentId,
  perms, togglePerm,
  delegate, setDelegate,
  saving, onSave, onClose,
}: {
  editing: boolean;
  roles: AdminRole[];
  name: string; setName: (v: string) => void;
  desc: string; setDesc: (v: string) => void;
  parentId: string; setParentId: (v: string) => void;
  perms: Set<AdminPermission>;
  togglePerm: (p: AdminPermission) => void;
  delegate: boolean; setDelegate: (v: boolean) => void;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-panel-bg rounded-2xl shadow-2xl border border-panel-border z-50 overflow-hidden max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-panel-border shrink-0">
          <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Shield size={18} className="text-primary" />
            {editing ? "编辑角色" : "创建角色"}
          </h3>
          <button onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-text-placeholder hover:bg-list-hover">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* 角色名称 */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              角色名称 <span className="text-red-400">*</span>
            </label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="例如「人事管理员」「IT管理员」"
              className="w-full h-9 px-3 rounded-lg border border-panel-border text-sm bg-bg-page
                text-text-primary outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          {/* 角色说明 */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">说明</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)}
              rows={2} placeholder="描述该角色的职责和用途"
              className="w-full px-3 py-2 rounded-lg border border-panel-border text-sm bg-bg-page
                text-text-primary outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>

          {/* 上级角色 */}
          {!editing && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">上级管理员角色</label>
              <select value={parentId} onChange={(e) => setParentId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-panel-border text-sm bg-bg-page
                  text-text-primary outline-none appearance-none cursor-pointer">
                <option value="">无（一级角色）</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <p className="text-[11px] text-text-placeholder mt-1">
                子角色的权限范围只能从上级角色拥有的权限中选择
              </p>
            </div>
          )}

          {/* 权限选择 */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">权限范围</label>
            <div className="space-y-1.5">
              {ALL_ADMIN_PERMISSIONS.map((p) => {
                const meta = ADMIN_PERMISSION_META[p];
                const checked = perms.has(p);
                // 如果选了上级角色，限制可选范围
                const parent = parentId ? roles.find((r) => r.id === parentId) : null;
                const disabled = parent ? !parent.permissions.includes(p) : false;

                return (
                  <label key={p}
                    className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors
                      ${checked ? "bg-primary/5 border-primary/20" : "border-panel-border hover:bg-list-hover"}
                      ${disabled ? "opacity-30 cursor-not-allowed" : ""}`}>
                    <input type="checkbox" checked={checked} disabled={disabled}
                      onChange={() => !disabled && togglePerm(p)}
                      className="mt-0.5 rounded border-panel-border text-primary" />
                    <div>
                      <span className="text-xs font-medium text-text-primary">{meta.label}</span>
                      <p className="text-[11px] text-text-placeholder mt-0.5">{meta.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 分配权限开关 */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={delegate}
              onChange={(e) => setDelegate(e.target.checked)}
              className="rounded border-panel-border text-primary" />
            <div>
              <span className="text-xs font-medium text-text-primary">允许向下级角色分配权限</span>
              <p className="text-[11px] text-text-placeholder">
                勾选后，该角色的管理员可创建子角色并分配自己拥有的权限
              </p>
            </div>
          </label>
        </div>

        <div className="px-5 py-3 border-t border-panel-border flex justify-end gap-2 shrink-0">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:bg-list-hover rounded-lg transition-colors">
            取消
          </button>
          <button onClick={onSave} disabled={saving || !name.trim() || perms.size === 0}
            className="flex items-center gap-1.5 px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium
              hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {editing ? "保存" : "创建角色"}
          </button>
        </div>
      </div>
    </>
  );
}
