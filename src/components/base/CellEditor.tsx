/**
 * 多维表格 - 通用单元格编辑器
 * 根据字段类型渲染不同的编辑控件
 * @author skylark
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Check, X, Star, ExternalLink, Search, Loader2 } from "lucide-react";
import type { BaseField, SelectOption, User, OrgMember } from "@/lib/types";

/** 选项颜色预设 */
const OPTION_COLORS = [
  "bg-blue-100 text-blue-700", "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700", "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700", "bg-cyan-100 text-cyan-700",
  "bg-yellow-100 text-yellow-700", "bg-red-100 text-red-700",
  "bg-indigo-100 text-indigo-700", "bg-teal-100 text-teal-700",
];

/** 根据颜色名获取对应 class */
function getColorClass(color: string): string {
  const idx = OPTION_COLORS.findIndex((c) => c.includes(color));
  return idx >= 0 ? OPTION_COLORS[idx] : OPTION_COLORS[0];
}

interface CellEditorProps {
  field: BaseField;
  value: unknown;
  onChange: (value: unknown) => void;
  /** 只读模式 */
  readonly?: boolean;
  /** 企业 ID（人员字段需要） */
  orgId?: string;
}

export default function CellEditor({ field, value, onChange, readonly, orgId }: CellEditorProps) {
  switch (field.type) {
    case "text":
    case "url":
    case "email":
    case "phone":
      return <TextCell field={field} value={value as string} onChange={onChange} readonly={readonly} />;
    case "number":
      return <NumberCell value={value as number} onChange={onChange} readonly={readonly} precision={field.options?.precision} />;
    case "date":
      return <DateCell value={value as string} onChange={onChange} readonly={readonly} />;
    case "checkbox":
      return <CheckboxCell value={value as boolean} onChange={onChange} readonly={readonly} />;
    case "select":
      return <SelectCell value={value as string} options={field.options?.choices || []} onChange={onChange} readonly={readonly} />;
    case "multi_select":
      return <MultiSelectCell value={value as string[]} options={field.options?.choices || []} onChange={onChange} readonly={readonly} />;
    case "rating":
      return <RatingCell value={value as number} max={field.options?.maxRating || 5} onChange={onChange} readonly={readonly} />;
    case "progress":
      return <ProgressCell value={value as number} onChange={onChange} readonly={readonly} />;
    case "member":
      return <MemberCell value={value as string} onChange={onChange} readonly={readonly} orgId={orgId} />;
    case "created_at":
    case "updated_at":
      return <span className="text-xs text-text-secondary truncate">{value ? new Date(value as string).toLocaleString("zh-CN") : ""}</span>;
    default:
      return <span className="text-xs text-text-placeholder">—</span>;
  }
}

/* ========== 文本单元格 ========== */
function TextCell({ field, value, onChange, readonly }: { field: BaseField; value: string; onChange: (v: unknown) => void; readonly?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value || ""); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== (value || "")) onChange(draft);
  };

  if (readonly || !editing) {
    const isUrl = field.type === "url" && value;
    return (
      <div
        className="w-full h-full flex items-center px-2 cursor-text min-h-8"
        onDoubleClick={() => !readonly && setEditing(true)}
      >
        {isUrl ? (
          <a href={value} target="_blank" rel="noreferrer" className="text-primary text-xs truncate hover:underline flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {value} <ExternalLink size={10} />
          </a>
        ) : (
          <span className="text-xs text-text-primary truncate">{value || ""}</span>
        )}
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value || ""); setEditing(false); } }}
      className="w-full h-full px-2 text-xs bg-transparent outline-none ring-2 ring-primary/40 rounded"
      type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
    />
  );
}

/* ========== 数字单元格 ========== */
function NumberCell({ value, onChange, readonly, precision }: { value: number; onChange: (v: unknown) => void; readonly?: boolean; precision?: number }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(String(value ?? "")); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    const num = parseFloat(draft);
    if (!isNaN(num) && num !== value) onChange(precision !== undefined ? parseFloat(num.toFixed(precision)) : num);
    else if (draft === "" && value !== undefined) onChange(null);
  };

  if (readonly || !editing) {
    return (
      <div className="w-full h-full flex items-center justify-end px-2 cursor-text min-h-8" onDoubleClick={() => !readonly && setEditing(true)}>
        <span className="text-xs text-text-primary">{value ?? ""}</span>
      </div>
    );
  }

  return (
    <input ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)}
      onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(String(value ?? "")); setEditing(false); } }}
      className="w-full h-full px-2 text-xs text-right bg-transparent outline-none ring-2 ring-primary/40 rounded" type="number" step="any" />
  );
}

/* ========== 日期单元格 ========== */
function DateCell({ value, onChange, readonly }: { value: string; onChange: (v: unknown) => void; readonly?: boolean }) {
  const formatted = value ? new Date(value).toISOString().split("T")[0] : "";

  if (readonly) {
    return <span className="text-xs text-text-primary px-2">{formatted}</span>;
  }

  return (
    <input
      type="date"
      value={formatted}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
      className="w-full h-full px-2 text-xs bg-transparent outline-none cursor-pointer"
    />
  );
}

/* ========== 复选框单元格 ========== */
function CheckboxCell({ value, onChange, readonly }: { value: boolean; onChange: (v: unknown) => void; readonly?: boolean }) {
  return (
    <div className="w-full h-full flex items-center justify-center min-h-8">
      <button
        onClick={() => !readonly && onChange(!value)}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
          ${value ? "bg-primary border-primary" : "border-panel-border hover:border-primary/50"}
          ${readonly ? "cursor-default" : "cursor-pointer"}`}
      >
        {value && <Check size={12} className="text-white" />}
      </button>
    </div>
  );
}

/* ========== 单选单元格 ========== */
function SelectCell({ value, options, onChange, readonly }: { value: string; options: SelectOption[]; onChange: (v: unknown) => void; readonly?: boolean }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.name === value);

  return (
    <div className="relative w-full h-full flex items-center px-1 min-h-8">
      <button
        onClick={() => !readonly && setOpen(!open)}
        className="flex items-center gap-1 w-full"
      >
        {current ? (
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getColorClass(current.color)}`}>
            {current.name}
          </span>
        ) : (
          <span className="text-xs text-text-placeholder">选择…</span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 w-44 bg-panel-bg rounded-lg shadow-lg border border-panel-border z-50 py-1 max-h-48 overflow-y-auto">
            {value && (
              <button onClick={() => { onChange(null); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-placeholder hover:bg-list-hover">
                <X size={12} /> 清除
              </button>
            )}
            {options.map((opt) => (
              <button key={opt.id} onClick={() => { onChange(opt.name); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-list-hover">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getColorClass(opt.color)}`}>
                  {opt.name}
                </span>
                {opt.name === value && <Check size={12} className="text-primary ml-auto" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ========== 多选单元格 ========== */
function MultiSelectCell({ value, options, onChange, readonly }: { value: string[]; options: SelectOption[]; onChange: (v: unknown) => void; readonly?: boolean }) {
  const [open, setOpen] = useState(false);
  const selected = Array.isArray(value) ? value : [];

  const toggle = (name: string) => {
    const next = selected.includes(name) ? selected.filter((s) => s !== name) : [...selected, name];
    onChange(next);
  };

  return (
    <div className="relative w-full h-full flex items-center px-1 gap-1 flex-wrap min-h-8">
      <button onClick={() => !readonly && setOpen(!open)} className="flex items-center gap-1 flex-wrap w-full min-h-6">
        {selected.length > 0 ? selected.map((s) => {
          const opt = options.find((o) => o.name === s);
          return (
            <span key={s} className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${opt ? getColorClass(opt.color) : "bg-gray-100 text-gray-600"}`}>
              {s}
            </span>
          );
        }) : <span className="text-xs text-text-placeholder">选择…</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 w-44 bg-panel-bg rounded-lg shadow-lg border border-panel-border z-50 py-1 max-h-48 overflow-y-auto">
            {options.map((opt) => (
              <button key={opt.id} onClick={() => toggle(opt.name)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-list-hover">
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${selected.includes(opt.name) ? "bg-primary border-primary" : "border-panel-border"}`}>
                  {selected.includes(opt.name) && <Check size={10} className="text-white" />}
                </div>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getColorClass(opt.color)}`}>
                  {opt.name}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ========== 评分单元格 ========== */
function RatingCell({ value, max, onChange, readonly }: { value: number; max: number; onChange: (v: unknown) => void; readonly?: boolean }) {
  const [hover, setHover] = useState(0);
  const current = value || 0;

  return (
    <div className="flex items-center gap-0.5 px-1 min-h-8">
      {Array.from({ length: max }, (_, i) => (
        <button
          key={i}
          onClick={() => !readonly && onChange(i + 1 === current ? 0 : i + 1)}
          onMouseEnter={() => !readonly && setHover(i + 1)}
          onMouseLeave={() => setHover(0)}
          className={readonly ? "cursor-default" : "cursor-pointer"}
        >
          <Star
            size={14}
            className={`transition-colors ${(hover || current) > i ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
          />
        </button>
      ))}
    </div>
  );
}

/* ========== 进度单元格 ========== */
function ProgressCell({ value, onChange, readonly }: { value: number; onChange: (v: unknown) => void; readonly?: boolean }) {
  const pct = Math.max(0, Math.min(100, value || 0));

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (readonly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newPct = Math.round((x / rect.width) * 100 / 10) * 10;
    onChange(newPct);
  }, [readonly, onChange]);

  return (
    <div className="flex items-center gap-2 px-2 min-h-8 w-full">
      <div className="flex-1 h-2 bg-gray-200 rounded-full cursor-pointer" onClick={handleClick}>
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-text-secondary w-8 text-right">{pct}%</span>
    </div>
  );
}

/* ========== 人员单元格 ========== */
function MemberCell({ value, onChange, readonly, orgId }: { value: string; onChange: (v: unknown) => void; readonly?: boolean; orgId?: string }) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<(OrgMember & { user: User })[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !orgId) return;
    setLoading(true);
    fetch(`/api/orgs/${orgId}/members`)
      .then((res) => res.json())
      .then((json) => {
        const result = json as { success: boolean; data?: (OrgMember & { user: User })[] };
        if (result.success && result.data) setMembers(result.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, orgId]);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  const filtered = search.trim()
    ? members.filter((m) => m.user.name.toLowerCase().includes(search.toLowerCase()) || m.user.email.toLowerCase().includes(search.toLowerCase()))
    : members;

  return (
    <div className="relative w-full h-full flex items-center px-2 min-h-8">
      <button
        className="flex items-center gap-1 w-full min-h-6 cursor-text"
        onDoubleClick={() => !readonly && setOpen(true)}
        onClick={() => !readonly && setOpen(true)}
      >
        {value ? (
          <span className="text-xs text-text-primary truncate">{value}</span>
        ) : (
          <span className="text-xs text-text-placeholder">选择人员…</span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 w-56 bg-panel-bg rounded-lg shadow-lg border border-panel-border z-50 overflow-hidden">
            {/* 搜索框 */}
            <div className="p-2 border-b border-panel-border">
              <div className="relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-placeholder" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索成员…"
                  className="w-full h-7 pl-7 pr-2 rounded bg-bg-page text-xs text-text-primary placeholder:text-text-placeholder outline-none"
                />
              </div>
            </div>
            {/* 清除选项 */}
            {value && (
              <button
                onClick={() => { onChange(null); setOpen(false); setSearch(""); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-placeholder hover:bg-list-hover"
              >
                <X size={12} /> 清除
              </button>
            )}
            {/* 成员列表 */}
            <div className="max-h-48 overflow-y-auto py-1">
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 size={16} className="text-primary animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-xs text-text-placeholder text-center py-4">无匹配成员</p>
              ) : (
                filtered.map((m) => (
                  <button
                    key={m.user_id}
                    onClick={() => { onChange(m.user.name); setOpen(false); setSearch(""); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-list-hover"
                  >
                    <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-medium flex items-center justify-center shrink-0">
                      {m.user.name.charAt(0)}
                    </div>
                    <span className="truncate text-text-primary">{m.user.name}</span>
                    {m.user.name === value && <Check size={12} className="text-primary ml-auto shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
