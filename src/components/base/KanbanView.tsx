/**
 * 多维表格 - 看板视图
 * 按单选字段分组展示记录卡片，支持拖拽切换分组
 * @author skylark
 */

"use client";

import { useState, useMemo, useCallback } from "react";
import { Plus, MoreHorizontal, GripVertical } from "lucide-react";
import type { BaseField, BaseRecord, BaseView, SelectOption } from "@/lib/types";

/** 选项颜色映射 */
const COLOR_MAP: Record<string, string> = {
  blue: "border-blue-300 bg-blue-50", green: "border-green-300 bg-green-50",
  purple: "border-purple-300 bg-purple-50", orange: "border-orange-300 bg-orange-50",
  pink: "border-pink-300 bg-pink-50", cyan: "border-cyan-300 bg-cyan-50",
  yellow: "border-yellow-300 bg-yellow-50", red: "border-red-300 bg-red-50",
  indigo: "border-indigo-300 bg-indigo-50", teal: "border-teal-300 bg-teal-50",
};

const TAG_COLOR: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700", green: "bg-green-100 text-green-700",
  purple: "bg-purple-100 text-purple-700", orange: "bg-orange-100 text-orange-700",
  pink: "bg-pink-100 text-pink-700", cyan: "bg-cyan-100 text-cyan-700",
  yellow: "bg-yellow-100 text-yellow-700", red: "bg-red-100 text-red-700",
  indigo: "bg-indigo-100 text-indigo-700", teal: "bg-teal-100 text-teal-700",
};

interface KanbanViewProps {
  fields: BaseField[];
  records: BaseRecord[];
  view: BaseView;
  onUpdateRecord: (recordId: string, data: Record<string, unknown>) => Promise<void>;
  onAddRecord: (initialData?: Record<string, unknown>) => Promise<void>;
  onUpdateView: (config: BaseView["config"]) => Promise<void>;
}

export default function KanbanView({
  fields, records, view, onUpdateRecord, onAddRecord, onUpdateView,
}: KanbanViewProps) {
  const config = view.config || {};
  const [dragRecordId, setDragRecordId] = useState<string | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);

  /** 分组字段 */
  const groupField = useMemo(() => {
    if (config.kanban_field_id) {
      return fields.find((f) => f.id === config.kanban_field_id) || null;
    }
    return fields.find((f) => f.type === "select") || null;
  }, [fields, config.kanban_field_id]);

  /** 标题字段 */
  const titleField = useMemo(() => fields.find((f) => f.is_primary) || fields[0], [fields]);

  /** 可选的分组字段列表 */
  const selectFields = useMemo(() => fields.filter((f) => f.type === "select"), [fields]);

  /** 分组数据 */
  const groups = useMemo(() => {
    if (!groupField) return [];
    const choices = groupField.options?.choices || [];
    const groupMap: Record<string, BaseRecord[]> = {};
    const unGrouped: BaseRecord[] = [];

    for (const choice of choices) {
      groupMap[choice.name] = [];
    }

    for (const rec of records) {
      const val = rec.data[groupField.id] as string;
      if (val && groupMap[val]) {
        groupMap[val].push(rec);
      } else {
        unGrouped.push(rec);
      }
    }

    const result = choices.map((choice) => ({
      option: choice,
      records: groupMap[choice.name] || [],
    }));

    if (unGrouped.length > 0) {
      result.push({
        option: { id: "__ungrouped__", name: "未分组", color: "gray" },
        records: unGrouped,
      });
    }

    return result;
  }, [groupField, records]);

  /** 拖拽到新分组 */
  const handleDrop = useCallback(
    async (groupName: string) => {
      if (!dragRecordId || !groupField) return;
      const rec = records.find((r) => r.id === dragRecordId);
      if (!rec) return;

      const newData = { ...rec.data, [groupField.id]: groupName === "未分组" ? null : groupName };
      await onUpdateRecord(dragRecordId, newData);
      setDragRecordId(null);
      setDragOverGroup(null);
    },
    [dragRecordId, groupField, records, onUpdateRecord]
  );

  /** 切换分组字段 */
  const changeGroupField = (fieldId: string) => {
    onUpdateView({ ...config, kanban_field_id: fieldId });
  };

  if (!groupField) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-text-placeholder text-sm">
        <p className="mb-4">看板视图需要一个「单选」字段作为分组依据</p>
        {selectFields.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs">选择分组字段：</p>
            {selectFields.map((f) => (
              <button key={f.id} onClick={() => changeGroupField(f.id)}
                className="block px-4 py-2 bg-primary/10 text-primary rounded-lg text-xs hover:bg-primary/20">
                {f.name}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs">请先添加一个「单选」类型的字段</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* 工具栏 */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-panel-border bg-panel-bg shrink-0">
        <span className="text-xs text-text-secondary">分组字段：</span>
        <select
          value={groupField.id}
          onChange={(e) => changeGroupField(e.target.value)}
          className="h-7 px-2 rounded border border-panel-border text-xs bg-panel-bg"
        >
          {selectFields.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      {/* 看板区域 */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="flex gap-4 h-full min-w-max">
          {groups.map(({ option, records: groupRecords }) => (
            <div
              key={option.id}
              className={`w-72 flex flex-col rounded-xl border-2 transition-colors shrink-0
                ${dragOverGroup === option.name ? "border-primary bg-primary/5" : COLOR_MAP[option.color] || "border-gray-200 bg-gray-50"}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverGroup(option.name); }}
              onDragLeave={() => setDragOverGroup(null)}
              onDrop={() => handleDrop(option.name)}
            >
              {/* 分组标题 */}
              <div className="flex items-center justify-between px-3 py-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TAG_COLOR[option.color] || "bg-gray-100 text-gray-600"}`}>
                    {option.name}
                  </span>
                  <span className="text-[10px] text-text-placeholder">{groupRecords.length}</span>
                </div>
              </div>

              {/* 卡片列表 */}
              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-0">
                {groupRecords.map((rec) => {
                  const title = titleField ? String(rec.data[titleField.id] || "") : rec.id;
                  return (
                    <div
                      key={rec.id}
                      draggable
                      onDragStart={() => setDragRecordId(rec.id)}
                      onDragEnd={() => { setDragRecordId(null); setDragOverGroup(null); }}
                      className={`bg-white rounded-lg shadow-sm border border-panel-border p-3 cursor-grab active:cursor-grabbing
                        hover:shadow-md transition-shadow ${dragRecordId === rec.id ? "opacity-50" : ""}`}
                    >
                      <p className="text-sm font-medium text-text-primary truncate mb-1">
                        {title || "未命名"}
                      </p>
                      {/* 显示前3个非主键、非分组字段的值 */}
                      <div className="space-y-0.5">
                        {fields
                          .filter((f) => !f.is_primary && f.id !== groupField.id && f.type !== "created_at" && f.type !== "updated_at")
                          .slice(0, 3)
                          .map((f) => {
                            const v = rec.data[f.id];
                            if (v == null || v === "") return null;
                            return (
                              <div key={f.id} className="flex items-center gap-1.5">
                                <span className="text-[10px] text-text-placeholder">{f.name}:</span>
                                <span className="text-[10px] text-text-secondary truncate">
                                  {f.type === "checkbox" ? (v ? "✓" : "✗") :
                                   f.type === "rating" ? "★".repeat(Number(v)) :
                                   f.type === "progress" ? `${v}%` :
                                   Array.isArray(v) ? (v as string[]).join(", ") :
                                   String(v)}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 底部添加 */}
              <button
                onClick={() => onAddRecord({ [groupField.id]: option.name === "未分组" ? null : option.name })}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-text-placeholder hover:text-primary transition-colors shrink-0"
              >
                <Plus size={13} /> 新增
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
