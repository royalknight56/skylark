/**
 * 管理后台 - 人员类型管理
 * 支持预置 + 自定义人员类型、启停用、设默认、批量新增、删除
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2, Plus, Trash2, Star, StarOff,
  ToggleLeft, ToggleRight, Tag, AlertCircle,
} from "lucide-react";
import { useOrg } from "@/lib/org-context";
import type { EmployeeType } from "@/lib/types";

export default function EmployeeTypesPage() {
  const { currentOrg } = useOrg();
  const [types, setTypes] = useState<EmployeeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [operating, setOperating] = useState<string | null>(null);

  // 新增
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [batchMode, setBatchMode] = useState(false);
  const [batchText, setBatchText] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const loadTypes = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/employee-types?org_id=${currentOrg.id}`);
      const json = (await res.json()) as { success: boolean; data?: EmployeeType[] };
      if (json.success && json.data) setTypes(json.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [currentOrg]);

  useEffect(() => { loadTypes(); }, [loadTypes]);

  /** 新增单个 */
  const handleAddSingle = async () => {
    if (!currentOrg || !newName.trim()) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/admin/employee-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: currentOrg.id, name: newName.trim() }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (json.success) {
        setNewName("");
        setShowAdd(false);
        await loadTypes();
      } else {
        setError(json.error || "新增失败");
      }
    } catch { setError("网络错误"); }
    finally { setAdding(false); }
  };

  /** 批量新增 */
  const handleAddBatch = async () => {
    if (!currentOrg || !batchText.trim()) return;
    const names = batchText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (names.length === 0) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/admin/employee-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: currentOrg.id, names }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (json.success) {
        setBatchText("");
        setShowAdd(false);
        setBatchMode(false);
        await loadTypes();
      } else {
        setError(json.error || "新增失败");
      }
    } catch { setError("网络错误"); }
    finally { setAdding(false); }
  };

  /** 启用/停用 */
  const handleToggle = async (t: EmployeeType) => {
    if (!currentOrg) return;
    setOperating(t.id);
    try {
      await fetch("/api/admin/employee-types", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: currentOrg.id,
          type_id: t.id,
          action: "toggle",
          is_active: !t.is_active,
        }),
      });
      await loadTypes();
    } catch { /* ignore */ }
    finally { setOperating(null); }
  };

  /** 设为默认 */
  const handleSetDefault = async (t: EmployeeType) => {
    if (!currentOrg || !t.is_active) return;
    setOperating(t.id);
    try {
      await fetch("/api/admin/employee-types", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: currentOrg.id,
          type_id: t.id,
          action: "set_default",
        }),
      });
      await loadTypes();
    } catch { /* ignore */ }
    finally { setOperating(null); }
  };

  /** 删除 */
  const handleDelete = async (t: EmployeeType) => {
    if (!currentOrg) return;
    if (!confirm(`确定删除人员类型「${t.name}」？`)) return;
    setOperating(t.id);
    setError("");
    try {
      const res = await fetch("/api/admin/employee-types", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: currentOrg.id, type_id: t.id }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (json.success) {
        await loadTypes();
      } else {
        setError(json.error || "删除失败");
      }
    } catch { setError("网络错误"); }
    finally { setOperating(null); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-primary animate-spin" />
      </div>
    );
  }

  const builtinTypes = types.filter((t) => t.is_builtin);
  const customTypes = types.filter((t) => !t.is_builtin);

  return (
    <div className="max-w-3xl">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Tag size={22} className="text-primary" />
            人员类型管理
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            管理员可自定义人员类型，便于在成员管理中分类管理成员
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setError(""); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium
            hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} /> 新增类型
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center gap-2 mb-4 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* 新增弹窗 */}
      {showAdd && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowAdd(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-panel-bg rounded-2xl shadow-2xl border border-panel-border z-50">
            <div className="flex items-center justify-between px-5 py-4 border-b border-panel-border">
              <h3 className="text-base font-semibold text-text-primary">新增人员类型</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBatchMode(!batchMode)}
                  className="text-xs text-primary hover:underline"
                >
                  {batchMode ? "单个新增" : "批量新增"}
                </button>
              </div>
            </div>
            <div className="px-5 py-4">
              {batchMode ? (
                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">
                    选项名称 <span className="text-text-placeholder">（每行一个）</span>
                  </label>
                  <textarea
                    value={batchText}
                    onChange={(e) => setBatchText(e.target.value)}
                    placeholder={"例如：\n全职\n兼职\n退休返聘"}
                    rows={5}
                    className="w-full px-3 py-2 rounded-lg border border-panel-border text-sm bg-bg-page
                      text-text-primary placeholder:text-text-placeholder outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">选项名称</label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="例如：专家"
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddSingle(); }}
                    className="w-full h-9 px-3 rounded-lg border border-panel-border text-sm bg-bg-page
                      text-text-primary placeholder:text-text-placeholder outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-panel-border flex justify-end gap-2">
              <button
                onClick={() => { setShowAdd(false); setBatchMode(false); setNewName(""); setBatchText(""); }}
                className="px-4 py-2 text-sm text-text-secondary hover:bg-list-hover rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={batchMode ? handleAddBatch : handleAddSingle}
                disabled={adding || (batchMode ? !batchText.trim() : !newName.trim())}
                className="flex items-center gap-1.5 px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium
                  hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {adding && <Loader2 size={14} className="animate-spin" />}
                确定
              </button>
            </div>
          </div>
        </>
      )}

      {/* 预置类型 */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
          预置选项
          <span className="text-xs text-text-placeholder font-normal">（不可删除）</span>
        </h2>
        <div className="bg-panel-bg rounded-xl border border-panel-border overflow-hidden">
          {builtinTypes.map((t) => (
            <TypeRow key={t.id} type={t} operating={operating === t.id}
              onToggle={() => handleToggle(t)}
              onSetDefault={() => handleSetDefault(t)}
            />
          ))}
        </div>
      </section>

      {/* 自定义类型 */}
      <section>
        <h2 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
          自定义选项
          <span className="text-xs text-text-placeholder font-normal">（{customTypes.length} 个）</span>
        </h2>
        {customTypes.length === 0 ? (
          <div className="bg-panel-bg rounded-xl border border-panel-border p-8 text-center">
            <Tag size={28} className="mx-auto mb-2 text-text-placeholder opacity-40" />
            <p className="text-sm text-text-secondary">暂无自定义人员类型</p>
            <p className="text-xs text-text-placeholder mt-1">点击上方「新增类型」添加</p>
          </div>
        ) : (
          <div className="bg-panel-bg rounded-xl border border-panel-border overflow-hidden">
            {customTypes.map((t) => (
              <TypeRow key={t.id} type={t} operating={operating === t.id}
                onToggle={() => handleToggle(t)}
                onSetDefault={() => handleSetDefault(t)}
                onDelete={() => handleDelete(t)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 说明 */}
      <div className="mt-6 px-4 py-3 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>使用说明：</strong>人员类型用于标记成员的身份类别（如正式、实习、外包等），
          便于在成员管理中分类筛选。停用后的类型不可被选择，已使用该类型的成员将显示"已停用"标识。
          删除自定义类型前需先清除或修改相关成员的人员类型。
        </p>
      </div>
    </div>
  );
}

/** 单行人员类型组件 */
function TypeRow({
  type, operating, onToggle, onSetDefault, onDelete,
}: {
  type: EmployeeType;
  operating: boolean;
  onToggle: () => void;
  onSetDefault: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-panel-border last:border-b-0 hover:bg-list-hover transition-colors">
      <div className="flex items-center gap-3">
        {/* 名称 */}
        <span className={`text-sm font-medium ${type.is_active ? "text-text-primary" : "text-text-placeholder line-through"}`}>
          {type.name}
        </span>
        {/* 标签 */}
        {type.is_builtin && (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500">预置</span>
        )}
        {type.is_default && (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-600">默认</span>
        )}
        {!type.is_active && (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-50 text-red-400">已停用</span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {operating ? (
          <Loader2 size={14} className="text-primary animate-spin mx-2" />
        ) : (
          <>
            {/* 启用/停用 */}
            <button onClick={onToggle} title={type.is_active ? "停用" : "启用"}
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors
                ${type.is_active
                  ? "text-green-600 hover:bg-green-50"
                  : "text-text-placeholder hover:bg-list-hover"}`}
            >
              {type.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            </button>

            {/* 设为默认 */}
            {type.is_active && (
              <button onClick={onSetDefault} title={type.is_default ? "当前为默认" : "设为默认"}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors
                  ${type.is_default
                    ? "text-amber-500"
                    : "text-text-placeholder hover:bg-amber-50 hover:text-amber-500"}`}
                disabled={type.is_default}
              >
                {type.is_default ? <Star size={15} /> : <StarOff size={15} />}
              </button>
            )}

            {/* 删除（仅自定义） */}
            {onDelete && (
              <button onClick={onDelete} title="删除"
                className="w-7 h-7 rounded-md flex items-center justify-center text-text-placeholder hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
