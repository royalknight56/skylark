/**
 * 管理后台 - 部门管理页面
 * CRUD 操作
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Pencil, Trash2, Building2, X, Check } from "lucide-react";
import { useOrg } from "@/lib/org-context";
import type { Department } from "@/lib/types";

export default function AdminDepartments() {
  const { currentOrg } = useOrg();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchDepartments = useCallback(() => {
    if (!currentOrg) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/admin/departments?org_id=${currentOrg.id}`)
      .then((res) => res.json() as Promise<{ success: boolean; data?: Department[] }>)
      .then((json) => {
        if (json.success && json.data) setDepartments(json.data);
      })
      .finally(() => setLoading(false));
  }, [currentOrg]);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  /** 创建部门 */
  const handleCreate = async () => {
    if (!currentOrg || !newName.trim()) return;
    setSubmitting(true);
    await fetch("/api/admin/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_id: currentOrg.id, name: newName.trim() }),
    });
    setNewName("");
    setShowCreate(false);
    setSubmitting(false);
    fetchDepartments();
  };

  /** 编辑部门名称 */
  const handleUpdate = async (deptId: string) => {
    if (!currentOrg || !editName.trim()) return;
    setSubmitting(true);
    await fetch("/api/admin/departments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_id: currentOrg.id, dept_id: deptId, name: editName.trim() }),
    });
    setEditingId(null);
    setSubmitting(false);
    fetchDepartments();
  };

  /** 删除部门 */
  const handleDelete = async (dept: Department) => {
    if (!currentOrg) return;
    if (!confirm(`确定要删除部门「${dept.name}」吗？`)) return;
    await fetch("/api/admin/departments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_id: currentOrg.id, dept_id: dept.id }),
    });
    fetchDepartments();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text-primary">部门管理</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus size={15} />
          新建部门
        </button>
      </div>

      {/* 新建部门表单 */}
      {showCreate && (
        <div className="bg-panel-bg rounded-xl border border-panel-border p-4 mb-4 flex items-center gap-3">
          <Building2 size={18} className="text-text-placeholder shrink-0" />
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="输入部门名称..."
            className="flex-1 text-sm bg-transparent border-b border-panel-border focus:border-primary
              outline-none py-1 text-text-primary placeholder:text-text-placeholder"
          />
          <button
            onClick={handleCreate}
            disabled={submitting || !newName.trim()}
            className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            <Check size={16} />
          </button>
          <button
            onClick={() => { setShowCreate(false); setNewName(""); }}
            className="p-1.5 rounded-lg text-text-placeholder hover:bg-list-hover transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 部门列表 */}
      <div className="space-y-2">
        {departments.map((dept) => (
          <div
            key={dept.id}
            className="bg-panel-bg rounded-xl border border-panel-border px-4 py-3 flex items-center gap-3"
          >
            <Building2 size={18} className="text-primary shrink-0" />
            {editingId === dept.id ? (
              <>
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUpdate(dept.id)}
                  className="flex-1 text-sm bg-transparent border-b border-primary outline-none py-0.5 text-text-primary"
                />
                <button
                  onClick={() => handleUpdate(dept.id)}
                  disabled={submitting || !editName.trim()}
                  className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                >
                  <Check size={15} />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="p-1.5 rounded-lg text-text-placeholder hover:bg-list-hover transition-colors"
                >
                  <X size={15} />
                </button>
              </>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">{dept.name}</p>
                  <p className="text-xs text-text-placeholder">{dept.member_count ?? 0} 名成员</p>
                </div>
                <button
                  onClick={() => { setEditingId(dept.id); setEditName(dept.name); }}
                  className="p-1.5 rounded-lg text-text-placeholder hover:text-primary hover:bg-primary/10 transition-colors"
                  title="编辑"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => handleDelete(dept)}
                  className="p-1.5 rounded-lg text-text-placeholder hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="删除"
                >
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>
        ))}
        {departments.length === 0 && !showCreate && (
          <div className="text-center py-16 text-text-placeholder text-sm">
            <Building2 size={36} className="mx-auto mb-3 opacity-30" />
            <p>暂无部门</p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-primary hover:underline mt-2 inline-block"
            >
              创建第一个部门
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
