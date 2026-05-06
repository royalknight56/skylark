/**
 * 多维表格 - 表格视图（核心组件）
 * 面向多维表格的 Grid 视图，支持字段管理、行编辑、筛选排序
 * @author skylark
 */

"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  Plus, Trash2, ChevronDown, Filter, ArrowUpDown,
  MoreHorizontal, GripVertical, Eye, EyeOff,
} from "lucide-react";
import FieldTypeIcon from "./FieldTypeIcon";
import { FIELD_TYPE_CONFIG, ADDABLE_FIELD_TYPES } from "./FieldTypeIcon";
import CellEditor from "./CellEditor";
import type {
  BaseField, BaseRecord, BaseView, BaseFieldType,
  BaseFieldOptions, SelectOption, ViewFilter, ViewSort,
} from "@/lib/types";

interface GridViewProps {
  baseId: string;
  tableId: string;
  fields: BaseField[];
  records: BaseRecord[];
  view: BaseView;
  orgId?: string;
  onAddField: (name: string, type: BaseFieldType, options?: BaseFieldOptions) => Promise<void>;
  onUpdateField: (fieldId: string, data: { name?: string; type?: string; options?: BaseFieldOptions }) => Promise<void>;
  onDeleteField: (fieldId: string) => Promise<void>;
  onAddRecord: () => Promise<void>;
  onUpdateRecord: (recordId: string, data: Record<string, unknown>) => Promise<void>;
  onDeleteRecords: (recordIds: string[]) => Promise<void>;
  onUpdateView: (config: BaseView["config"]) => Promise<void>;
}

/** 选项颜色预设 */
const COLOR_PRESETS = [
  "blue", "green", "purple", "orange", "pink",
  "cyan", "yellow", "red", "indigo", "teal",
];

export default function GridView({
  baseId, tableId, fields, records, view, orgId,
  onAddField, onUpdateField, onDeleteField,
  onAddRecord, onUpdateRecord, onDeleteRecords,
  onUpdateView,
}: GridViewProps) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<BaseFieldType>("text");
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [fieldMenuId, setFieldMenuId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const config = view.config || {};
  const hiddenFields = config.hidden_fields || [];

  /** 可见字段 */
  const visibleFields = useMemo(
    () => fields.filter((f) => !hiddenFields.includes(f.id)),
    [fields, hiddenFields]
  );

  /** 应用筛选 */
  const filteredRecords = useMemo(() => {
    if (!config.filters || config.filters.length === 0) return records;
    return records.filter((rec) =>
      config.filters!.every((filter) => matchFilter(rec.data, filter, fields))
    );
  }, [records, config.filters, fields]);

  /** 应用排序 */
  const sortedRecords = useMemo(() => {
    if (!config.sorts || config.sorts.length === 0) return filteredRecords;
    return [...filteredRecords].sort((a, b) => {
      for (const sort of config.sorts!) {
        const va = a.data[sort.field_id];
        const vb = b.data[sort.field_id];
        const cmp = compareValues(va, vb);
        if (cmp !== 0) return sort.direction === "asc" ? cmp : -cmp;
      }
      return 0;
    });
  }, [filteredRecords, config.sorts]);

  /** 全选 / 取消全选 */
  const toggleSelectAll = () => {
    if (selectedRows.size === sortedRecords.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(sortedRecords.map((r) => r.id)));
    }
  };

  /** 单行选择 */
  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  /** 更新单元格 */
  const handleCellChange = useCallback(
    (recordId: string, fieldId: string, value: unknown) => {
      const rec = records.find((r) => r.id === recordId);
      if (!rec) return;
      const newData = { ...rec.data, [fieldId]: value };
      onUpdateRecord(recordId, newData);
    },
    [records, onUpdateRecord]
  );

  /** 添加字段 */
  const handleAddField = async () => {
    if (!newFieldName.trim()) return;
    let options: BaseFieldOptions | undefined;
    if (newFieldType === "select" || newFieldType === "multi_select") {
      options = {
        choices: [
          { id: "opt1", name: "选项1", color: "blue" },
          { id: "opt2", name: "选项2", color: "green" },
          { id: "opt3", name: "选项3", color: "purple" },
        ],
      };
    } else if (newFieldType === "rating") {
      options = { maxRating: 5 };
    }
    await onAddField(newFieldName.trim(), newFieldType, options);
    setNewFieldName("");
    setNewFieldType("text");
    setShowAddField(false);
  };

  /** 批量删除 */
  const handleBatchDelete = async () => {
    if (selectedRows.size === 0) return;
    await onDeleteRecords(Array.from(selectedRows));
    setSelectedRows(new Set());
  };

  /** 切换字段隐藏 */
  const toggleFieldVisibility = (fieldId: string) => {
    const newHidden = hiddenFields.includes(fieldId)
      ? hiddenFields.filter((id) => id !== fieldId)
      : [...hiddenFields, fieldId];
    onUpdateView({ ...config, hidden_fields: newHidden });
  };

  /** 添加筛选 */
  const addFilter = () => {
    if (fields.length === 0) return;
    const newFilter: ViewFilter = { field_id: fields[0].id, operator: "contains", value: "" };
    onUpdateView({ ...config, filters: [...(config.filters || []), newFilter] });
  };

  /** 更新筛选 */
  const updateFilter = (index: number, filter: ViewFilter) => {
    const filters = [...(config.filters || [])];
    filters[index] = filter;
    onUpdateView({ ...config, filters });
  };

  /** 删除筛选 */
  const removeFilter = (index: number) => {
    const filters = (config.filters || []).filter((_, i) => i !== index);
    onUpdateView({ ...config, filters });
  };

  /** 添加排序 */
  const addSort = () => {
    if (fields.length === 0) return;
    const newSort: ViewSort = { field_id: fields[0].id, direction: "asc" };
    onUpdateView({ ...config, sorts: [...(config.sorts || []), newSort] });
  };

  /** 删除排序 */
  const removeSort = (index: number) => {
    const sorts = (config.sorts || []).filter((_, i) => i !== index);
    onUpdateView({ ...config, sorts });
  };

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-panel-border bg-panel-bg shrink-0 flex-wrap">
        {/* 筛选 */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors
            ${(config.filters?.length ?? 0) > 0 ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-list-hover"}`}
        >
          <Filter size={13} />
          筛选{(config.filters?.length ?? 0) > 0 && ` (${config.filters!.length})`}
        </button>

        {/* 排序 */}
        <button
          onClick={() => setShowSort(!showSort)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors
            ${(config.sorts?.length ?? 0) > 0 ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-list-hover"}`}
        >
          <ArrowUpDown size={13} />
          排序{(config.sorts?.length ?? 0) > 0 && ` (${config.sorts!.length})`}
        </button>

        <div className="flex-1" />

        {/* 批量操作 */}
        {selectedRows.size > 0 && (
          <button onClick={handleBatchDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={13} />
            删除 {selectedRows.size} 条
          </button>
        )}

        {/* 新增记录 */}
        <button onClick={onAddRecord}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-primary hover:bg-primary/10 transition-colors">
          <Plus size={13} />
          新增记录
        </button>
      </div>

      {/* 筛选面板 */}
      {showFilters && (
        <div className="px-4 py-2 border-b border-panel-border bg-bg-page space-y-2 shrink-0">
          {(config.filters || []).map((filter, i) => (
            <div key={i} className="flex items-center gap-2 flex-wrap">
              <select value={filter.field_id} onChange={(e) => updateFilter(i, { ...filter, field_id: e.target.value })}
                className="h-7 px-2 rounded border border-panel-border text-xs bg-panel-bg">
                {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <select value={filter.operator} onChange={(e) => updateFilter(i, { ...filter, operator: e.target.value as ViewFilter["operator"] })}
                className="h-7 px-2 rounded border border-panel-border text-xs bg-panel-bg">
                <option value="contains">包含</option>
                <option value="not_contains">不包含</option>
                <option value="eq">等于</option>
                <option value="neq">不等于</option>
                <option value="is_empty">为空</option>
                <option value="is_not_empty">不为空</option>
                <option value="gt">大于</option>
                <option value="lt">小于</option>
              </select>
              {!["is_empty", "is_not_empty"].includes(filter.operator) && (
                <input value={String(filter.value || "")} onChange={(e) => updateFilter(i, { ...filter, value: e.target.value })}
                  className="h-7 px-2 rounded border border-panel-border text-xs bg-panel-bg w-32" placeholder="值…" />
              )}
              <button onClick={() => removeFilter(i)} className="text-text-placeholder hover:text-red-500"><Trash2 size={13} /></button>
            </div>
          ))}
          <button onClick={addFilter} className="text-xs text-primary hover:underline flex items-center gap-1">
            <Plus size={12} /> 添加筛选条件
          </button>
        </div>
      )}

      {/* 排序面板 */}
      {showSort && (
        <div className="px-4 py-2 border-b border-panel-border bg-bg-page space-y-2 shrink-0">
          {(config.sorts || []).map((sort, i) => (
            <div key={i} className="flex items-center gap-2">
              <select value={sort.field_id} onChange={(e) => {
                const sorts = [...(config.sorts || [])];
                sorts[i] = { ...sort, field_id: e.target.value };
                onUpdateView({ ...config, sorts });
              }} className="h-7 px-2 rounded border border-panel-border text-xs bg-panel-bg">
                {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <select value={sort.direction} onChange={(e) => {
                const sorts = [...(config.sorts || [])];
                sorts[i] = { ...sort, direction: e.target.value as "asc" | "desc" };
                onUpdateView({ ...config, sorts });
              }} className="h-7 px-2 rounded border border-panel-border text-xs bg-panel-bg">
                <option value="asc">升序</option>
                <option value="desc">降序</option>
              </select>
              <button onClick={() => removeSort(i)} className="text-text-placeholder hover:text-red-500"><Trash2 size={13} /></button>
            </div>
          ))}
          <button onClick={addSort} className="text-xs text-primary hover:underline flex items-center gap-1">
            <Plus size={12} /> 添加排序条件
          </button>
        </div>
      )}

      {/* 表格区域 */}
      <div ref={scrollRef} className="flex-1 overflow-auto min-h-0">
        <table className="w-full border-collapse min-w-max">
          {/* 表头 */}
          <thead className="sticky top-0 z-10">
            <tr className="bg-bg-page">
              {/* 选择列 */}
              <th className="w-10 h-8 border-b border-r border-panel-border bg-bg-page sticky left-0 z-20">
                <div className="flex items-center justify-center">
                  <input type="checkbox"
                    checked={sortedRecords.length > 0 && selectedRows.size === sortedRecords.length}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 accent-primary cursor-pointer" />
                </div>
              </th>
              {/* 行号列 */}
              <th className="w-10 h-8 border-b border-r border-panel-border bg-bg-page text-[10px] text-text-placeholder font-normal sticky left-10 z-20">
                #
              </th>
              {/* 字段列 */}
              {visibleFields.map((field) => (
                <th key={field.id}
                  className="h-8 border-b border-r border-panel-border bg-bg-page px-2 min-w-30 max-w-75 relative group"
                  style={{ width: config.field_widths?.[field.id] || 180 }}
                >
                  <div className="flex items-center gap-1.5">
                    <FieldTypeIcon type={field.type} size={13} />
                    {editingFieldId === field.id ? (
                      <FieldNameEditor
                        name={field.name}
                        onSave={(name) => { onUpdateField(field.id, { name }); setEditingFieldId(null); }}
                        onCancel={() => setEditingFieldId(null)}
                      />
                    ) : (
                      <span className="text-xs font-medium text-text-primary truncate cursor-default"
                        onDoubleClick={() => !field.is_primary || setEditingFieldId(field.id)}
                        onClick={() => setEditingFieldId(field.id)}>
                        {field.name}
                      </span>
                    )}
                    {/* 字段菜单按钮 */}
                    <button
                      onClick={() => setFieldMenuId(fieldMenuId === field.id ? null : field.id)}
                      className="ml-auto opacity-0 group-hover:opacity-100 text-text-placeholder hover:text-text-primary transition-opacity"
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                  {/* 字段菜单 */}
                  {fieldMenuId === field.id && (
                    <FieldMenu
                      field={field}
                      onClose={() => setFieldMenuId(null)}
                      onRename={() => { setEditingFieldId(field.id); setFieldMenuId(null); }}
                      onToggleHide={() => { toggleFieldVisibility(field.id); setFieldMenuId(null); }}
                      onDelete={() => { onDeleteField(field.id); setFieldMenuId(null); }}
                      onUpdateOptions={(options) => { onUpdateField(field.id, { options }); }}
                    />
                  )}
                </th>
              ))}
              {/* 添加字段按钮 */}
              <th className="w-10 h-8 border-b border-panel-border bg-bg-page">
                <button onClick={() => setShowAddField(true)}
                  className="w-full h-full flex items-center justify-center text-text-placeholder hover:text-primary transition-colors">
                  <Plus size={14} />
                </button>
              </th>
            </tr>
          </thead>

          {/* 表体 */}
          <tbody>
            {sortedRecords.map((record, rowIndex) => (
              <tr key={record.id} className={`group ${selectedRows.has(record.id) ? "bg-primary/5" : "hover:bg-list-hover/50"}`}>
                <td className="w-10 h-8 border-b border-r border-panel-border sticky left-0 bg-panel-bg z-10">
                  <div className="flex items-center justify-center">
                    <input type="checkbox" checked={selectedRows.has(record.id)}
                      onChange={() => toggleRow(record.id)}
                      className="w-3.5 h-3.5 accent-primary cursor-pointer" />
                  </div>
                </td>
                <td className="w-10 h-8 border-b border-r border-panel-border sticky left-10 bg-panel-bg z-10 text-center text-[10px] text-text-placeholder">
                  {rowIndex + 1}
                </td>
                {visibleFields.map((field) => (
                  <td key={field.id} className="h-8 border-b border-r border-panel-border"
                    style={{ width: config.field_widths?.[field.id] || 180, minWidth: 120, maxWidth: 300 }}>
                    <CellEditor
                      field={field}
                      value={
                        field.type === "created_at" ? record.created_at :
                        field.type === "updated_at" ? record.updated_at :
                        record.data[field.id]
                      }
                      onChange={(val) => handleCellChange(record.id, field.id, val)}
                      readonly={field.type === "created_at" || field.type === "updated_at"}
                      orgId={orgId}
                    />
                  </td>
                ))}
                <td className="w-10 h-8 border-b border-panel-border" />
              </tr>
            ))}
          </tbody>
        </table>

        {/* 底部新增行 */}
        <button onClick={onAddRecord}
          className="w-full h-8 flex items-center gap-2 px-4 text-xs text-text-placeholder hover:text-primary hover:bg-list-hover/50 transition-colors border-b border-panel-border">
          <Plus size={13} /> 新增记录
        </button>
      </div>

      {/* 底部状态栏 */}
      <div className="h-7 px-4 flex items-center border-t border-panel-border bg-bg-page text-[10px] text-text-placeholder shrink-0">
        共 {sortedRecords.length} 条记录
        {selectedRows.size > 0 && ` · 已选 ${selectedRows.size} 条`}
        {(config.filters?.length ?? 0) > 0 && ` · ${config.filters!.length} 个筛选`}
      </div>

      {/* 新建字段弹窗 */}
      {showAddField && (
        <AddFieldModal
          onAdd={handleAddField}
          onClose={() => setShowAddField(false)}
          name={newFieldName}
          setName={setNewFieldName}
          type={newFieldType}
          setType={setNewFieldType}
        />
      )}
    </div>
  );
}

/* ========== 字段名编辑器 ========== */
function FieldNameEditor({ name, onSave, onCancel }: { name: string; onSave: (name: string) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(name);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);

  return (
    <input ref={ref} value={draft} onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { if (draft.trim()) onSave(draft.trim()); else onCancel(); }}
      onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) onSave(draft.trim()); if (e.key === "Escape") onCancel(); }}
      className="text-xs font-medium w-full bg-transparent outline-none ring-1 ring-primary/40 rounded px-1" />
  );
}

/* ========== 字段操作菜单 ========== */
function FieldMenu({
  field, onClose, onRename, onToggleHide, onDelete, onUpdateOptions,
}: {
  field: BaseField;
  onClose: () => void;
  onRename: () => void;
  onToggleHide: () => void;
  onDelete: () => void;
  onUpdateOptions: (options: BaseFieldOptions) => void;
}) {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1 w-48 bg-panel-bg rounded-lg shadow-lg border border-panel-border z-50 py-1">
        <button onClick={onRename}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-list-hover">
          重命名字段
        </button>
        <button onClick={onToggleHide}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-list-hover">
          <EyeOff size={12} /> 隐藏字段
        </button>
        {(field.type === "select" || field.type === "multi_select") && (
          <button onClick={() => setShowOptions(!showOptions)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-list-hover">
            管理选项…
          </button>
        )}
        {!field.is_primary && (
          <>
            <div className="border-t border-panel-border my-1" />
            <button onClick={onDelete}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">
              <Trash2 size={12} /> 删除字段
            </button>
          </>
        )}
        {showOptions && (
          <OptionEditor
            options={field.options?.choices || []}
            onSave={(choices) => { onUpdateOptions({ ...field.options, choices }); setShowOptions(false); }}
            onClose={() => setShowOptions(false)}
          />
        )}
      </div>
    </>
  );
}

/* ========== 选项管理器 ========== */
function OptionEditor({ options, onSave, onClose }: { options: SelectOption[]; onSave: (opts: SelectOption[]) => void; onClose: () => void }) {
  const [items, setItems] = useState<SelectOption[]>(options);
  const [newName, setNewName] = useState("");

  const addOption = () => {
    if (!newName.trim()) return;
    const id = `opt-${Date.now().toString(36)}`;
    setItems([...items, { id, name: newName.trim(), color: COLOR_PRESETS[items.length % COLOR_PRESETS.length] }]);
    setNewName("");
  };

  const removeOption = (id: string) => setItems(items.filter((o) => o.id !== id));

  return (
    <div className="border-t border-panel-border mt-1 pt-2 px-3 pb-2 space-y-2">
      {items.map((opt) => (
        <div key={opt.id} className="flex items-center gap-1.5">
          <span className="text-xs flex-1">{opt.name}</span>
          <button onClick={() => removeOption(opt.id)} className="text-text-placeholder hover:text-red-500"><Trash2 size={11} /></button>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <input value={newName} onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addOption(); }}
          placeholder="新增选项…" className="flex-1 h-6 px-1.5 text-xs border border-panel-border rounded bg-bg-page outline-none" />
        <button onClick={addOption} className="text-primary"><Plus size={12} /></button>
      </div>
      <button onClick={() => onSave(items)}
        className="w-full h-6 rounded bg-primary text-white text-xs hover:bg-primary/90 transition-colors">
        保存
      </button>
    </div>
  );
}

/* ========== 新建字段弹窗 ========== */
function AddFieldModal({
  onAdd, onClose, name, setName, type, setType,
}: {
  onAdd: () => void; onClose: () => void;
  name: string; setName: (v: string) => void;
  type: BaseFieldType; setType: (v: BaseFieldType) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-80 bg-panel-bg rounded-xl shadow-2xl border border-panel-border z-50 p-4 space-y-3">
        <h4 className="text-sm font-semibold text-text-primary">新增字段</h4>
        <div>
          <label className="text-xs text-text-secondary block mb-1">字段名称</label>
          <input ref={ref} value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onAdd(); }}
            className="w-full h-9 px-3 rounded-lg border border-panel-border text-sm bg-bg-page outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="输入字段名称…" />
        </div>
        <div>
          <label className="text-xs text-text-secondary block mb-1">字段类型</label>
          <div className="grid grid-cols-3 gap-1.5">
            {ADDABLE_FIELD_TYPES.map((t) => {
              const cfg = FIELD_TYPE_CONFIG[t];
              const Icon = cfg.icon;
              return (
                <button key={t} onClick={() => setType(t)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors
                    ${type === t ? "bg-primary/10 text-primary ring-1 ring-primary/30" : "text-text-secondary hover:bg-list-hover"}`}>
                  <Icon size={13} className={cfg.color} />
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-1.5 text-xs text-text-secondary hover:bg-list-hover rounded-lg">取消</button>
          <button onClick={onAdd} disabled={!name.trim()}
            className="px-4 py-1.5 text-xs text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50">
            确认
          </button>
        </div>
      </div>
    </>
  );
}

/* ========== 工具函数 ========== */

/** 筛选匹配 */
function matchFilter(data: Record<string, unknown>, filter: ViewFilter, fields: BaseField[]): boolean {
  const val = data[filter.field_id];
  const strVal = val != null ? String(val).toLowerCase() : "";
  const filterVal = filter.value != null ? String(filter.value).toLowerCase() : "";

  switch (filter.operator) {
    case "eq": return strVal === filterVal;
    case "neq": return strVal !== filterVal;
    case "contains": return strVal.includes(filterVal);
    case "not_contains": return !strVal.includes(filterVal);
    case "gt": return Number(val) > Number(filter.value);
    case "lt": return Number(val) < Number(filter.value);
    case "gte": return Number(val) >= Number(filter.value);
    case "lte": return Number(val) <= Number(filter.value);
    case "is_empty": return val == null || strVal === "";
    case "is_not_empty": return val != null && strVal !== "";
    default: return true;
  }
}

/** 通用比较 */
function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "zh-CN");
}
