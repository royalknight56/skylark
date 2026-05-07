/**
 * 文档列表组件
 * @author skylark
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Plus, FileText, Table2, MoreHorizontal, Send, Pencil, Trash2 } from "lucide-react";
import type { Document } from "@/lib/types";

interface DocListProps {
  documents: Document[];
  selectedId?: string;
  onSelect: (doc: Document) => void;
  onCreateNew: (type: "doc" | "sheet") => void;
  hiddenOnMobile?: boolean;
  onShare?: (doc: Document) => void;
  onRename?: (doc: Document, newTitle: string) => void;
  onDelete?: (doc: Document) => void;
}

/** 格式化更新时间 */
function formatUpdatedAt(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const oneDay = 86400000;

  if (diff < oneDay) {
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  }
  if (diff < oneDay * 2) return "昨天";
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

export default function DocList({ documents, selectedId, onSelect, onCreateNew, hiddenOnMobile = false, onShare, onRename, onDelete }: DocListProps) {
  const [searchText, setSearchText] = useState("");
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [menuDocId, setMenuDocId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && renameRef.current) renameRef.current.focus();
  }, [renamingId]);

  const startRename = (doc: Document) => {
    setRenamingId(doc.id);
    setRenameValue(doc.title);
    setMenuDocId(null);
  };

  const confirmRename = (doc: Document) => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== doc.title) onRename?.(doc, trimmed);
    setRenamingId(null);
  };

  const handleDelete = (doc: Document) => {
    setMenuDocId(null);
    if (confirm(`确定删除「${doc.title}」？此操作不可撤销。`)) onDelete?.(doc);
  };

  const filtered = documents.filter((d) =>
    searchText ? d.title.toLowerCase().includes(searchText.toLowerCase()) : true
  );

  return (
    <div className={`w-full md:w-72 h-full border-r border-panel-border bg-panel-bg flex-col flex-shrink-0
      ${hiddenOnMobile ? "hidden md:flex" : "flex"}`}>
      {/* 顶部 */}
      <div className="h-14 px-4 flex items-center justify-between flex-shrink-0 border-b border-panel-border">
        <h2 className="text-base font-semibold text-text-primary">云文档</h2>
        <div className="relative">
          <button
            onClick={() => setShowNewMenu(!showNewMenu)}
            className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary
              hover:bg-list-hover transition-colors"
            title="新建文档"
          >
            <Plus size={18} />
          </button>
          {showNewMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNewMenu(false)} />
              <div className="absolute right-0 top-8 w-36 bg-panel-bg rounded-lg shadow-lg border border-panel-border z-50 py-1">
                <button
                  onClick={() => { onCreateNew("doc"); setShowNewMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-list-hover transition-colors"
                >
                  <FileText size={16} className="text-primary" />
                  新建文档
                </button>
                <button
                  onClick={() => { onCreateNew("sheet"); setShowNewMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-list-hover transition-colors"
                >
                  <Table2 size={16} className="text-success" />
                  新建表格
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 搜索 */}
      <div className="px-3 py-2 flex-shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-placeholder" />
          <input
            type="text"
            placeholder="搜索文档"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full h-8 pl-8 pr-3 rounded-md bg-bg-page border-none outline-none
              text-sm text-text-primary placeholder:text-text-placeholder"
          />
        </div>
      </div>

      {/* 文档列表 */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((doc) => {
          const isActive = selectedId === doc.id;
          const Icon = doc.type === "sheet" ? Table2 : FileText;
          const iconColor = doc.type === "sheet" ? "text-success" : "text-primary";

          return (
            <div
              key={doc.id}
              onClick={() => onSelect(doc)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") onSelect(doc); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer group
                ${isActive ? "bg-list-active" : "hover:bg-list-hover"}`}
            >
              <Icon size={20} className={iconColor} />
              <div className="flex-1 min-w-0">
                {renamingId === doc.id ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <input ref={renameRef} value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmRename(doc);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      onBlur={() => confirmRename(doc)}
                      className="flex-1 h-6 px-1.5 rounded border border-primary text-sm text-text-primary bg-bg-page outline-none" />
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-text-primary truncate">{doc.title}</p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {doc.creator?.name || "我"} · {formatUpdatedAt(doc.updated_at)}
                    </p>
                  </>
                )}
              </div>
              {renamingId !== doc.id && (
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuDocId(menuDocId === doc.id ? null : doc.id); }}
                    className="w-6 h-6 rounded flex items-center justify-center text-text-placeholder
                      hover:bg-panel-border transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                  {menuDocId === doc.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMenuDocId(null); }} />
                      <div className="absolute right-0 top-7 w-36 bg-panel-bg rounded-lg shadow-lg border border-panel-border z-50 py-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); startRename(doc); }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-list-hover transition-colors">
                          <Pencil size={12} /> 重命名
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuDocId(null); onShare?.(doc); }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-list-hover transition-colors">
                          <Send size={12} className="text-primary" /> 发送给联系人
                        </button>
                        <div className="h-px bg-panel-border my-1" />
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(doc); }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={12} /> 删除
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-12 text-center text-text-placeholder text-sm">
            暂无文档
          </div>
        )}
      </div>
    </div>
  );
}
