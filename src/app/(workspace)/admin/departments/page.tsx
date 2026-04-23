/**
 * 管理后台 - 部门管理页面
 * 树状结构 CRUD
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2, Plus, Pencil, Trash2, Building2, X, Check,
  ChevronRight, ChevronDown, FolderPlus,
} from "lucide-react";
import { useOrg } from "@/lib/org-context";
import type { Department } from "@/lib/types";

/** 将扁平列表构建为树 */
function buildTree(list: Department[]): Department[] {
  const map = new Map<string, Department>();
  const roots: Department[] = [];

  for (const dept of list) {
    map.set(dept.id, { ...dept, children: [] });
  }
  for (const dept of list) {
    const node = map.get(dept.id)!;
    if (dept.parent_id && map.has(dept.parent_id)) {
      map.get(dept.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

/** 树节点组件 */
function DeptNode({
  dept,
  depth,
  expanded,
  editingId,
  editName,
  submitting,
  creatingParentId,
  newChildName,
  onToggle,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditNameChange,
  onDelete,
  onStartCreateChild,
  onCancelCreateChild,
  onSaveCreateChild,
  onNewChildNameChange,
}: {
  dept: Department;
  depth: number;
  expanded: Set<string>;
  editingId: string | null;
  editName: string;
  submitting: boolean;
  creatingParentId: string | null;
  newChildName: string;
  onToggle: (id: string) => void;
  onStartEdit: (id: string, name: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
  onEditNameChange: (v: string) => void;
  onDelete: (dept: Department) => void;
  onStartCreateChild: (parentId: string) => void;
  onCancelCreateChild: () => void;
  onSaveCreateChild: () => void;
  onNewChildNameChange: (v: string) => void;
}) {
  const hasChildren = dept.children && dept.children.length > 0;
  const isExpanded = expanded.has(dept.id);
  const isEditing = editingId === dept.id;
  const isCreatingChild = creatingParentId === dept.id;
  const indent = depth * 24;

  return (
    <>
      {/* 当前节点 */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-list-hover/50 transition-colors group"
        style={{ paddingLeft: `${12 + indent}px` }}
      >
        {/* 展开/折叠箭头 */}
        <button
          onClick={() => onToggle(dept.id)}
          className={`w-5 h-5 flex items-center justify-center shrink-0 rounded transition-colors
            ${hasChildren ? "text-text-secondary hover:text-text-primary" : "text-transparent"}`}
          disabled={!hasChildren}
        >
          {hasChildren && (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
        </button>

        <Building2 size={16} className="text-primary shrink-0" />

        {isEditing ? (
          <>
            <input
              autoFocus
              value={editName}
              onChange={(e) => onEditNameChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onSaveEdit(dept.id); if (e.key === "Escape") onCancelEdit(); }}
              className="flex-1 text-sm bg-transparent border-b border-primary outline-none py-0.5 text-text-primary"
            />
            <button
              onClick={() => onSaveEdit(dept.id)}
              disabled={submitting || !editName.trim()}
              className="p-1 rounded text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
            >
              <Check size={14} />
            </button>
            <button onClick={onCancelEdit} className="p-1 rounded text-text-placeholder hover:bg-list-hover transition-colors">
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-text-primary">{dept.name}</span>
              <span className="text-xs text-text-placeholder ml-2">{dept.member_count ?? 0} 人</span>
            </div>
            {/* 操作按钮 - hover 显示 */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onStartCreateChild(dept.id)}
                className="p-1 rounded text-text-placeholder hover:text-primary hover:bg-primary/10 transition-colors"
                title="添加子部门"
              >
                <FolderPlus size={14} />
              </button>
              <button
                onClick={() => onStartEdit(dept.id, dept.name)}
                className="p-1 rounded text-text-placeholder hover:text-primary hover:bg-primary/10 transition-colors"
                title="编辑"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => onDelete(dept)}
                className="p-1 rounded text-text-placeholder hover:text-red-500 hover:bg-red-50 transition-colors"
                title="删除"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* 在当前节点下方插入「新建子部门」输入行 */}
      {isCreatingChild && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5"
          style={{ paddingLeft: `${12 + indent + 24}px` }}
        >
          <Building2 size={14} className="text-text-placeholder shrink-0" />
          <input
            autoFocus
            value={newChildName}
            onChange={(e) => onNewChildNameChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onSaveCreateChild(); if (e.key === "Escape") onCancelCreateChild(); }}
            placeholder="子部门名称..."
            className="flex-1 text-sm bg-transparent border-b border-panel-border focus:border-primary
              outline-none py-0.5 text-text-primary placeholder:text-text-placeholder"
          />
          <button
            onClick={onSaveCreateChild}
            disabled={submitting || !newChildName.trim()}
            className="p-1 rounded text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            <Check size={14} />
          </button>
          <button onClick={onCancelCreateChild} className="p-1 rounded text-text-placeholder hover:bg-list-hover transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* 子节点 */}
      {hasChildren && isExpanded && dept.children!.map((child) => (
        <DeptNode
          key={child.id}
          dept={child}
          depth={depth + 1}
          expanded={expanded}
          editingId={editingId}
          editName={editName}
          submitting={submitting}
          creatingParentId={creatingParentId}
          newChildName={newChildName}
          onToggle={onToggle}
          onStartEdit={onStartEdit}
          onCancelEdit={onCancelEdit}
          onSaveEdit={onSaveEdit}
          onEditNameChange={onEditNameChange}
          onDelete={onDelete}
          onStartCreateChild={onStartCreateChild}
          onCancelCreateChild={onCancelCreateChild}
          onSaveCreateChild={onSaveCreateChild}
          onNewChildNameChange={onNewChildNameChange}
        />
      ))}
    </>
  );
}

export default function AdminDepartments() {
  const { currentOrg } = useOrg();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tree, setTree] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  /* 新建顶级部门 */
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  /* 新建子部门 */
  const [creatingParentId, setCreatingParentId] = useState<string | null>(null);
  const [newChildName, setNewChildName] = useState("");

  /* 编辑 */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  /* 展开状态 */
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchDepartments = useCallback(() => {
    if (!currentOrg) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/admin/departments?org_id=${currentOrg.id}`)
      .then((res) => res.json() as Promise<{ success: boolean; data?: Department[] }>)
      .then((json) => {
        if (json.success && json.data) {
          setDepartments(json.data);
          setTree(buildTree(json.data));
          // 默认全部展开
          setExpanded(new Set(json.data.map((d) => d.id)));
        }
      })
      .finally(() => setLoading(false));
  }, [currentOrg]);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  /** 创建顶级部门 */
  const handleCreateRoot = async () => {
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

  /** 创建子部门 */
  const handleCreateChild = async () => {
    if (!currentOrg || !creatingParentId || !newChildName.trim()) return;
    setSubmitting(true);
    await fetch("/api/admin/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_id: currentOrg.id, name: newChildName.trim(), parent_id: creatingParentId }),
    });
    // 确保父节点展开
    setExpanded((prev) => new Set(prev).add(creatingParentId));
    setNewChildName("");
    setCreatingParentId(null);
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
    const childCount = dept.children?.length ?? 0;
    const msg = childCount > 0
      ? `部门「${dept.name}」下有 ${childCount} 个子部门，删除后子部门将变为顶级部门。确定？`
      : `确定要删除部门「${dept.name}」吗？`;
    if (!confirm(msg)) return;
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
        <div>
          <h1 className="text-xl font-bold text-text-primary">部门管理</h1>
          <p className="text-xs text-text-placeholder mt-1">{departments.length} 个部门</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreatingParentId(null); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus size={15} />
          新建部门
        </button>
      </div>

      {/* 新建顶级部门表单 */}
      {showCreate && (
        <div className="bg-panel-bg rounded-xl border border-panel-border p-4 mb-4 flex items-center gap-3">
          <Building2 size={18} className="text-text-placeholder shrink-0" />
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateRoot(); if (e.key === "Escape") { setShowCreate(false); setNewName(""); } }}
            placeholder="输入部门名称..."
            className="flex-1 text-sm bg-transparent border-b border-panel-border focus:border-primary
              outline-none py-1 text-text-primary placeholder:text-text-placeholder"
          />
          <button
            onClick={handleCreateRoot}
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

      {/* 部门树 */}
      <div className="bg-panel-bg rounded-xl border border-panel-border py-1">
        {tree.length > 0 ? (
          tree.map((dept) => (
            <DeptNode
              key={dept.id}
              dept={dept}
              depth={0}
              expanded={expanded}
              editingId={editingId}
              editName={editName}
              submitting={submitting}
              creatingParentId={creatingParentId}
              newChildName={newChildName}
              onToggle={toggleExpand}
              onStartEdit={(id, name) => { setEditingId(id); setEditName(name); }}
              onCancelEdit={() => setEditingId(null)}
              onSaveEdit={handleUpdate}
              onEditNameChange={setEditName}
              onDelete={handleDelete}
              onStartCreateChild={(parentId) => { setCreatingParentId(parentId); setNewChildName(""); setShowCreate(false); }}
              onCancelCreateChild={() => { setCreatingParentId(null); setNewChildName(""); }}
              onSaveCreateChild={handleCreateChild}
              onNewChildNameChange={setNewChildName}
            />
          ))
        ) : !showCreate ? (
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
        ) : null}
      </div>
    </div>
  );
}
