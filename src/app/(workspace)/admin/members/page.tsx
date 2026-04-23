/**
 * 管理后台 - 成员管理页面
 * 表格展示 + 角色变更 / 移除操作
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Search, UserMinus, ChevronDown } from "lucide-react";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import type { OrgMember, OrgMemberRole } from "@/lib/types";

const ROLE_LABELS: Record<OrgMemberRole, string> = {
  owner: "创建者",
  admin: "管理员",
  member: "成员",
};

export default function AdminMembers() {
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingRole, setEditingRole] = useState<string | null>(null);

  const fetchMembers = useCallback(() => {
    if (!currentOrg) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/admin/members?org_id=${currentOrg.id}`)
      .then((res) => res.json() as Promise<{ success: boolean; data?: OrgMember[] }>)
      .then((json) => {
        if (json.success && json.data) setMembers(json.data);
      })
      .finally(() => setLoading(false));
  }, [currentOrg]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  /** 搜索过滤 */
  const filtered = members.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.user?.name.toLowerCase().includes(q) ||
      m.user?.email.toLowerCase().includes(q) ||
      m.department?.toLowerCase().includes(q)
    );
  });

  /** 变更角色 */
  const handleRoleChange = async (targetUserId: string, newRole: OrgMemberRole) => {
    if (!currentOrg) return;
    setEditingRole(null);
    await fetch("/api/admin/members", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_id: currentOrg.id, target_user_id: targetUserId, role: newRole }),
    });
    fetchMembers();
  };

  /** 移除成员 */
  const handleRemove = async (targetUserId: string, name: string) => {
    if (!currentOrg) return;
    if (!confirm(`确定要移除成员「${name}」吗？`)) return;
    await fetch("/api/admin/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_id: currentOrg.id, target_user_id: targetUserId }),
    });
    fetchMembers();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text-primary">成员管理</h1>
        <span className="text-sm text-text-placeholder">{members.length} 名成员</span>
      </div>

      {/* 搜索栏 */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-placeholder" />
        <input
          type="text"
          placeholder="搜索姓名、邮箱或部门..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-panel-bg border border-panel-border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-primary/30 text-text-primary placeholder:text-text-placeholder"
        />
      </div>

      {/* 成员表格 */}
      <div className="bg-panel-bg rounded-xl border border-panel-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-panel-border bg-bg-page/50">
              <th className="text-left px-4 py-3 text-text-placeholder font-medium">成员</th>
              <th className="text-left px-4 py-3 text-text-placeholder font-medium">部门</th>
              <th className="text-left px-4 py-3 text-text-placeholder font-medium">职位</th>
              <th className="text-left px-4 py-3 text-text-placeholder font-medium">角色</th>
              <th className="text-right px-4 py-3 text-text-placeholder font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const isSelf = m.user_id === user?.id;
              return (
                <tr key={m.user_id} className="border-b border-panel-border last:border-0 hover:bg-list-hover transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full avatar-placeholder avatar-blue text-xs shrink-0">
                        {m.user?.name?.charAt(0) || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-text-primary font-medium truncate">{m.user?.name}</p>
                        <p className="text-xs text-text-placeholder truncate">{m.user?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{m.department || "-"}</td>
                  <td className="px-4 py-3 text-text-secondary">{m.title || "-"}</td>
                  <td className="px-4 py-3">
                    {isSelf || m.role === "owner" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                        {ROLE_LABELS[m.role]}
                      </span>
                    ) : (
                      <div className="relative">
                        <button
                          onClick={() => setEditingRole(editingRole === m.user_id ? null : m.user_id)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-text-secondary hover:bg-gray-200 transition-colors"
                        >
                          {ROLE_LABELS[m.role]}
                          <ChevronDown size={12} />
                        </button>
                        {editingRole === m.user_id && (
                          <div className="absolute top-full left-0 mt-1 bg-panel-bg rounded-lg shadow-lg border border-panel-border z-20 py-1 w-28">
                            {(["admin", "member"] as OrgMemberRole[]).map((r) => (
                              <button
                                key={r}
                                onClick={() => handleRoleChange(m.user_id, r)}
                                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-list-hover transition-colors
                                  ${m.role === r ? "text-primary font-medium" : "text-text-secondary"}`}
                              >
                                {ROLE_LABELS[r]}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!isSelf && m.role !== "owner" && (
                      <button
                        onClick={() => handleRemove(m.user_id, m.user?.name || "")}
                        className="p-1.5 rounded-lg text-text-placeholder hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="移除成员"
                      >
                        <UserMinus size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-text-placeholder text-sm py-12">暂无成员</p>
        )}
      </div>
    </div>
  );
}
