/**
 * 文档列表组件
 * @author skylark
 */

"use client";

import { useState } from "react";
import { Search, Plus, FileText, Table2, MoreHorizontal } from "lucide-react";
import type { Document } from "@/lib/types";

interface DocListProps {
  documents: Document[];
  selectedId?: string;
  onSelect: (doc: Document) => void;
  onCreateNew: (type: "doc" | "sheet") => void;
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

export default function DocList({ documents, selectedId, onSelect, onCreateNew }: DocListProps) {
  const [searchText, setSearchText] = useState("");
  const [showNewMenu, setShowNewMenu] = useState(false);

  const filtered = documents.filter((d) =>
    searchText ? d.title.toLowerCase().includes(searchText.toLowerCase()) : true
  );

  return (
    <div className="w-72 h-full border-r border-panel-border bg-panel-bg flex flex-col flex-shrink-0">
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
                <p className="text-sm font-medium text-text-primary truncate">{doc.title}</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {doc.creator?.name || "我"} · {formatUpdatedAt(doc.updated_at)}
                </p>
              </div>
              <button
                onClick={(e) => e.stopPropagation()}
                className="w-6 h-6 rounded flex items-center justify-center text-text-placeholder
                  hover:bg-panel-border transition-colors opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal size={14} />
              </button>
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
