/**
 * 多维表格详情页
 * 支持多数据表切换、多视图切换（表格 / 看板 / 表单）
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback, use, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, ChevronLeft, Plus, Table2, Columns3,
  FileSpreadsheet, MoreHorizontal, Trash2, Pencil,
  LayoutGrid, Kanban, FileInput, Settings2,
} from "lucide-react";
import GridView from "@/components/base/GridView";
import KanbanView from "@/components/base/KanbanView";
import FormView from "@/components/base/FormView";
import { FIELD_TYPE_CONFIG } from "@/components/base/FieldTypeIcon";
import type {
  Base, BaseTable, BaseField, BaseRecord, BaseView,
  BaseFieldType, BaseFieldOptions, BaseViewConfig, BaseViewType,
} from "@/lib/types";

/** 视图类型图标映射 */
const VIEW_ICONS: Record<BaseViewType, typeof LayoutGrid> = {
  grid: LayoutGrid,
  kanban: Kanban,
  form: FileInput,
};

/** 视图类型名称 */
const VIEW_LABELS: Record<BaseViewType, string> = {
  grid: "表格视图",
  kanban: "看板视图",
  form: "表单视图",
};

interface TableWithDetails extends BaseTable {
  fields: BaseField[];
  views: BaseView[];
  records: BaseRecord[];
}

interface BaseDetail extends Base {
  tables: TableWithDetails[];
}

type PendingRecordEdits = Record<string, { data: Record<string, unknown>; updatedAt: string }>;

const RECORD_SAVE_DELAY_MS = 600;
const VIEW_SAVE_DELAY_MS = 700;

function pendingRecordKey(baseId: string) {
  return `skylark:base-record-edits:${baseId}`;
}

function readPendingRecordEdits(baseId: string): PendingRecordEdits {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(pendingRecordKey(baseId));
    return raw ? (JSON.parse(raw) as PendingRecordEdits) : {};
  } catch {
    return {};
  }
}

function writePendingRecordEdits(baseId: string, pending: Map<string, { data: Record<string, unknown>; updatedAt: string }>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(pendingRecordKey(baseId), JSON.stringify(Object.fromEntries(pending)));
  } catch {
    // localStorage may be unavailable or full; editing should continue.
  }
}

function applyPendingRecordEdits(base: BaseDetail, pending: Map<string, { data: Record<string, unknown>; updatedAt: string }>): BaseDetail {
  if (pending.size === 0) return base;
  return {
    ...base,
    tables: base.tables.map((table) => ({
      ...table,
      records: table.records.map((record) => {
        const edit = pending.get(record.id);
        return edit ? { ...record, data: edit.data, updated_at: edit.updatedAt } : record;
      }),
    })),
  };
}

export default function BaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [base, setBase] = useState<BaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [baseName, setBaseName] = useState("");
  const [showNewTable, setShowNewTable] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [showNewView, setShowNewView] = useState(false);
  const [tableMenuId, setTableMenuId] = useState<string | null>(null);
  const [renamingTableId, setRenamingTableId] = useState<string | null>(null);
  const [renameTableName, setRenameTableName] = useState("");
  const pendingRecordEditsRef = useRef(new Map<string, { data: Record<string, unknown>; updatedAt: string }>());
  const recordSaveTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const viewSaveTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const updateTableRecords = useCallback((tableId: string, updater: (records: BaseRecord[]) => BaseRecord[]) => {
    setBase((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tables: prev.tables.map((table) =>
          table.id === tableId ? { ...table, records: updater(table.records) } : table
        ),
      };
    });
  }, []);

  const updateViewConfigLocal = useCallback((viewId: string, config: BaseViewConfig) => {
    setBase((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tables: prev.tables.map((table) => ({
          ...table,
          views: table.views.map((view) => view.id === viewId ? { ...view, config } : view),
        })),
      };
    });
  }, []);

  const scheduleRecordSave = useCallback((recordId: string, data: Record<string, unknown>) => {
    const updatedAt = new Date().toISOString();
    pendingRecordEditsRef.current.set(recordId, { data, updatedAt });
    writePendingRecordEdits(id, pendingRecordEditsRef.current);

    const existing = recordSaveTimersRef.current.get(recordId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/bases/${id}/records`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ record_id: recordId, data }),
        });
        if (!res.ok) throw new Error("save failed");

        const latest = pendingRecordEditsRef.current.get(recordId);
        if (latest && JSON.stringify(latest.data) === JSON.stringify(data)) {
          pendingRecordEditsRef.current.delete(recordId);
          writePendingRecordEdits(id, pendingRecordEditsRef.current);
        }
      } catch {
        pendingRecordEditsRef.current.set(recordId, { data, updatedAt: new Date().toISOString() });
        writePendingRecordEdits(id, pendingRecordEditsRef.current);
      } finally {
        recordSaveTimersRef.current.delete(recordId);
      }
    }, RECORD_SAVE_DELAY_MS);

    recordSaveTimersRef.current.set(recordId, timer);
  }, [id]);

  const scheduleViewSave = useCallback((viewId: string, config: BaseViewConfig) => {
    const existing = viewSaveTimersRef.current.get(viewId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      try {
        await fetch(`/api/bases/${id}/views`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ view_id: viewId, config }),
        });
      } catch {
        // View config remains optimistic locally; the next successful edit will retry latest config.
      } finally {
        viewSaveTimersRef.current.delete(viewId);
      }
    }, VIEW_SAVE_DELAY_MS);

    viewSaveTimersRef.current.set(viewId, timer);
  }, [id]);

  /** 加载数据 */
  const loadBase = useCallback(async () => {
    try {
      const res = await fetch(`/api/bases/${id}`);
      const json = (await res.json()) as { success: boolean; data?: BaseDetail };
      if (json.success && json.data) {
        const pending = new Map(Object.entries(readPendingRecordEdits(id)));
        pendingRecordEditsRef.current = pending;
        const nextBase = applyPendingRecordEdits(json.data, pending);
        setBase(nextBase);
        setBaseName(nextBase.name);
        pending.forEach((edit, recordId) => scheduleRecordSave(recordId, edit.data));
        if (!activeTableId && nextBase.tables.length > 0) {
          setActiveTableId(nextBase.tables[0].id);
          if (nextBase.tables[0].views.length > 0) {
            setActiveViewId(nextBase.tables[0].views[0].id);
          }
        }
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [id, activeTableId, scheduleRecordSave]);

  useEffect(() => { loadBase(); }, [loadBase]);

  useEffect(() => {
    return () => {
      recordSaveTimersRef.current.forEach((timer) => clearTimeout(timer));
      viewSaveTimersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const activeTable = base?.tables.find((t) => t.id === activeTableId) || null;
  const activeView = activeTable?.views.find((v) => v.id === activeViewId) || null;

  /** 切换数据表 */
  const switchTable = (tableId: string) => {
    setActiveTableId(tableId);
    const table = base?.tables.find((t) => t.id === tableId);
    if (table && table.views.length > 0) {
      setActiveViewId(table.views[0].id);
    } else {
      setActiveViewId(null);
    }
  };

  /** 更新 base 名称 */
  const handleRenameSave = async () => {
    if (!baseName.trim() || !base) return;
    setEditingName(false);
    await fetch(`/api/bases/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: baseName.trim() }),
    });
    setBase({ ...base, name: baseName.trim() });
  };

  /** 新建数据表 */
  const handleCreateTable = async () => {
    if (!newTableName.trim()) return;
    const res = await fetch(`/api/bases/${id}/tables`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTableName.trim() }),
    });
    const json = (await res.json()) as { success: boolean; data?: BaseTable };
    if (json.success) {
      setShowNewTable(false);
      setNewTableName("");
      await loadBase();
      if (json.data) switchTable(json.data.id);
    }
  };

  /** 删除数据表 */
  const handleDeleteTable = async (tableId: string) => {
    await fetch(`/api/bases/${id}/tables`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table_id: tableId, action: "delete" }),
    });
    setTableMenuId(null);
    await loadBase();
  };

  /** 重命名数据表 */
  const handleRenameTable = async (tableId: string) => {
    if (!renameTableName.trim()) return;
    await fetch(`/api/bases/${id}/tables`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table_id: tableId, name: renameTableName.trim() }),
    });
    setRenamingTableId(null);
    await loadBase();
  };

  /** 新建字段 */
  const handleAddField = useCallback(async (name: string, type: BaseFieldType, options?: BaseFieldOptions) => {
    if (!activeTableId) return;
    await fetch(`/api/bases/${id}/fields`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table_id: activeTableId, name, type, options }),
    });
    await loadBase();
  }, [id, activeTableId, loadBase]);

  /** 更新字段 */
  const handleUpdateField = useCallback(async (fieldId: string, data: { name?: string; type?: string; options?: BaseFieldOptions }) => {
    await fetch(`/api/bases/${id}/fields`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field_id: fieldId, ...data }),
    });
    await loadBase();
  }, [id, loadBase]);

  /** 删除字段 */
  const handleDeleteField = useCallback(async (fieldId: string) => {
    if (!activeTableId) return;
    await fetch(`/api/bases/${id}/fields`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field_id: fieldId, table_id: activeTableId }),
    });
    await loadBase();
  }, [id, activeTableId, loadBase]);

  /** 新增记录 */
  const handleAddRecord = useCallback(async (initialData?: Record<string, unknown>) => {
    if (!activeTableId) return;
    const res = await fetch(`/api/bases/${id}/records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table_id: activeTableId, data: initialData || {} }),
    });
    const json = (await res.json()) as { success: boolean; data?: BaseRecord };
    if (json.success && json.data) {
      updateTableRecords(activeTableId, (records) => [...records, json.data!]);
    }
  }, [id, activeTableId, updateTableRecords]);

  /** 更新记录 */
  const handleUpdateRecord = useCallback(async (recordId: string, data: Record<string, unknown>) => {
    if (!activeTableId) return;
    const updatedAt = new Date().toISOString();
    updateTableRecords(activeTableId, (records) =>
      records.map((record) => record.id === recordId ? { ...record, data, updated_at: updatedAt } : record)
    );
    scheduleRecordSave(recordId, data);
  }, [activeTableId, updateTableRecords, scheduleRecordSave]);

  /** 删除记录 */
  const handleDeleteRecords = useCallback(async (recordIds: string[]) => {
    if (!activeTableId) return;
    updateTableRecords(activeTableId, (records) => records.filter((record) => !recordIds.includes(record.id)));
    for (const recordId of recordIds) {
      const timer = recordSaveTimersRef.current.get(recordId);
      if (timer) clearTimeout(timer);
      recordSaveTimersRef.current.delete(recordId);
      pendingRecordEditsRef.current.delete(recordId);
    }
    writePendingRecordEdits(id, pendingRecordEditsRef.current);
    await fetch(`/api/bases/${id}/records`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ record_ids: recordIds }),
    });
  }, [id, activeTableId, updateTableRecords]);

  /** 更新视图 */
  const handleUpdateView = useCallback(async (config: BaseViewConfig) => {
    if (!activeViewId) return;
    updateViewConfigLocal(activeViewId, config);
    scheduleViewSave(activeViewId, config);
  }, [activeViewId, updateViewConfigLocal, scheduleViewSave]);

  /** 新建视图 */
  const handleCreateView = async (type: BaseViewType) => {
    if (!activeTableId) return;
    const name = VIEW_LABELS[type];
    const res = await fetch(`/api/bases/${id}/views`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table_id: activeTableId, name, type }),
    });
    const json = (await res.json()) as { success: boolean; data?: BaseView };
    if (json.success && json.data) {
      setActiveViewId(json.data.id);
      setShowNewView(false);
      await loadBase();
    }
  };

  /** 删除视图 */
  const handleDeleteView = async (viewId: string) => {
    await fetch(`/api/bases/${id}/views`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ view_id: viewId }),
    });
    await loadBase();
    if (activeViewId === viewId) {
      const remaining = activeTable?.views.filter((v) => v.id !== viewId) || [];
      setActiveViewId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-page">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  if (!base) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-page text-text-placeholder text-sm">
        表格不存在
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-bg-page min-h-0">
      {/* 顶部标题栏 */}
      <div className="h-12 px-4 flex items-center gap-3 border-b border-panel-border bg-panel-bg shrink-0">
        <button onClick={() => router.push("/bases")}
          className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:bg-list-hover transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="text-lg">{base.icon || "📊"}</span>
        {editingName ? (
          <input value={baseName} onChange={(e) => setBaseName(e.target.value)}
            onBlur={handleRenameSave}
            onKeyDown={(e) => { if (e.key === "Enter") handleRenameSave(); if (e.key === "Escape") { setBaseName(base.name); setEditingName(false); } }}
            className="text-base font-semibold text-text-primary bg-transparent outline-none ring-1 ring-primary/40 rounded px-2 py-0.5"
            autoFocus />
        ) : (
          <h1 className="text-base font-semibold text-text-primary cursor-pointer hover:text-primary"
            onClick={() => setEditingName(true)}>
            {base.name}
          </h1>
        )}
      </div>

      {/* 数据表选项卡 */}
      <div className="h-9 px-2 flex items-center gap-0.5 border-b border-panel-border bg-panel-bg shrink-0 overflow-x-auto">
        {base.tables.map((table) => (
          <div key={table.id} className="relative group flex items-center">
            {renamingTableId === table.id ? (
              <input value={renameTableName} onChange={(e) => setRenameTableName(e.target.value)}
                onBlur={() => handleRenameTable(table.id)}
                onKeyDown={(e) => { if (e.key === "Enter") handleRenameTable(table.id); if (e.key === "Escape") setRenamingTableId(null); }}
                className="h-7 px-2 text-xs bg-transparent outline-none ring-1 ring-primary/40 rounded" autoFocus />
            ) : (
              <button onClick={() => switchTable(table.id)}
                className={`h-7 flex items-center gap-1.5 px-3 rounded-md text-xs transition-colors
                  ${activeTableId === table.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-text-secondary hover:bg-list-hover"}`}>
                <FileSpreadsheet size={13} />
                {table.name}
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); setTableMenuId(tableMenuId === table.id ? null : table.id); }}
              className="w-5 h-5 rounded flex items-center justify-center text-text-placeholder opacity-0 group-hover:opacity-100 hover:text-text-primary transition-all">
              <MoreHorizontal size={11} />
            </button>
            {tableMenuId === table.id && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setTableMenuId(null)} />
                <div className="absolute left-0 top-full mt-1 w-32 bg-panel-bg rounded-lg shadow-lg border border-panel-border z-50 py-1">
                  <button onClick={() => { setRenamingTableId(table.id); setRenameTableName(table.name); setTableMenuId(null); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-list-hover">
                    <Pencil size={11} /> 重命名
                  </button>
                  {base.tables.length > 1 && (
                    <button onClick={() => handleDeleteTable(table.id)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">
                      <Trash2 size={11} /> 删除
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
        {/* 新增数据表 */}
        {showNewTable ? (
          <div className="flex items-center gap-1">
            <input value={newTableName} onChange={(e) => setNewTableName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateTable(); if (e.key === "Escape") setShowNewTable(false); }}
              placeholder="表名…" className="h-7 px-2 text-xs border border-panel-border rounded bg-bg-page outline-none w-24" autoFocus />
            <button onClick={handleCreateTable} className="text-primary text-xs px-1">确定</button>
          </div>
        ) : (
          <button onClick={() => setShowNewTable(true)}
            className="w-7 h-7 rounded-md flex items-center justify-center text-text-placeholder hover:text-primary hover:bg-list-hover transition-colors">
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* 视图选项卡 */}
      {activeTable && (
        <div className="h-8 px-2 flex items-center gap-0.5 border-b border-panel-border bg-bg-page shrink-0 overflow-x-auto">
          {activeTable.views.map((view) => {
            const Icon = VIEW_ICONS[view.type] || LayoutGrid;
            return (
              <div key={view.id} className="relative group flex items-center">
                <button onClick={() => setActiveViewId(view.id)}
                  className={`h-6 flex items-center gap-1.5 px-2.5 rounded text-[11px] transition-colors
                    ${activeViewId === view.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-text-secondary hover:bg-list-hover"}`}>
                  <Icon size={12} />
                  {view.name}
                </button>
                {activeTable.views.length > 1 && (
                  <button onClick={() => handleDeleteView(view.id)}
                    className="w-4 h-4 rounded flex items-center justify-center text-text-placeholder opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">
                    <Trash2 size={9} />
                  </button>
                )}
              </div>
            );
          })}
          {/* 新建视图 */}
          <div className="relative">
            <button onClick={() => setShowNewView(!showNewView)}
              className="h-6 flex items-center gap-1 px-2 text-[11px] text-text-placeholder hover:text-primary rounded hover:bg-list-hover transition-colors">
              <Plus size={12} /> 新建视图
            </button>
            {showNewView && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNewView(false)} />
                <div className="absolute left-0 top-full mt-1 w-36 bg-panel-bg rounded-lg shadow-lg border border-panel-border z-50 py-1">
                  {(["grid", "kanban", "form"] as BaseViewType[]).map((type) => {
                    const Icon = VIEW_ICONS[type];
                    return (
                      <button key={type} onClick={() => handleCreateView(type)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-list-hover">
                        <Icon size={13} /> {VIEW_LABELS[type]}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 视图内容 */}
      {activeTable && activeView ? (
        activeView.type === "grid" ? (
          <GridView
            baseId={id}
            tableId={activeTableId!}
            fields={activeTable.fields}
            records={activeTable.records}
            view={activeView}
            orgId={base?.org_id}
            onAddField={handleAddField}
            onUpdateField={handleUpdateField}
            onDeleteField={handleDeleteField}
            onAddRecord={async () => handleAddRecord()}
            onUpdateRecord={handleUpdateRecord}
            onDeleteRecords={handleDeleteRecords}
            onUpdateView={handleUpdateView}
          />
        ) : activeView.type === "kanban" ? (
          <KanbanView
            fields={activeTable.fields}
            records={activeTable.records}
            view={activeView}
            onUpdateRecord={handleUpdateRecord}
            onAddRecord={handleAddRecord}
            onUpdateView={handleUpdateView}
          />
        ) : activeView.type === "form" ? (
          <FormView
            fields={activeTable.fields}
            view={activeView}
            orgId={base?.org_id}
            onAddRecord={handleAddRecord}
          />
        ) : null
      ) : (
        <div className="flex-1 flex items-center justify-center text-text-placeholder text-sm">
          请选择一个视图
        </div>
      )}
    </div>
  );
}
