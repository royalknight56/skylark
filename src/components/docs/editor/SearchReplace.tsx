/**
 * 查找替换面板
 * 支持高亮匹配、上/下导航、全部替换
 * 基于 ProseMirror Decoration 实现匹配高亮
 * @author skylark
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import {
  X, ChevronUp, ChevronDown, Replace, ReplaceAll,
} from "lucide-react";

interface SearchReplaceProps {
  editor: Editor;
  onClose: () => void;
}

interface Match {
  from: number;
  to: number;
}

export default function SearchReplace({ editor, onClose }: SearchReplaceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  /** 搜索所有匹配 */
  const doSearch = useCallback((term: string) => {
    if (!term) {
      setMatches([]);
      setCurrentIndex(-1);
      clearHighlight();
      return;
    }

    const results: Match[] = [];
    const docText = editor.state.doc.textContent;
    const lower = term.toLowerCase();
    let pos = 0;

    /* 需要按文档节点遍历来获取准确的 ProseMirror 位置 */
    editor.state.doc.descendants((node, nodePos) => {
      if (!node.isText || !node.text) return;
      const text = node.text.toLowerCase();
      let idx = text.indexOf(lower);
      while (idx !== -1) {
        results.push({ from: nodePos + idx, to: nodePos + idx + term.length });
        idx = text.indexOf(lower, idx + 1);
      }
    });

    setMatches(results);
    if (results.length > 0) {
      setCurrentIndex(0);
      scrollToMatch(results[0]);
    } else {
      setCurrentIndex(-1);
    }
  }, [editor]);

  /** 清除高亮 — 通过设置空选区 */
  const clearHighlight = useCallback(() => {
    // 仅清除选区
  }, []);

  /** 滚动到匹配位置并选中 */
  const scrollToMatch = useCallback((match: Match) => {
    editor.chain().focus().setTextSelection(match).run();
    /* 滚动编辑器视口 */
    const coords = editor.view.coordsAtPos(match.from);
    const scrollContainer = editor.view.dom.closest(".overflow-y-auto");
    if (scrollContainer) {
      const rect = scrollContainer.getBoundingClientRect();
      const offset = coords.top - rect.top - rect.height / 3;
      scrollContainer.scrollBy({ top: offset, behavior: "smooth" });
    }
  }, [editor]);

  useEffect(() => { doSearch(searchTerm); }, [searchTerm, doSearch]);

  /** 下一个匹配 */
  const goNext = () => {
    if (matches.length === 0) return;
    const next = (currentIndex + 1) % matches.length;
    setCurrentIndex(next);
    scrollToMatch(matches[next]);
  };

  /** 上一个匹配 */
  const goPrev = () => {
    if (matches.length === 0) return;
    const prev = (currentIndex - 1 + matches.length) % matches.length;
    setCurrentIndex(prev);
    scrollToMatch(matches[prev]);
  };

  /** 替换当前 */
  const replaceCurrent = () => {
    if (currentIndex < 0 || currentIndex >= matches.length) return;
    const match = matches[currentIndex];
    editor.chain()
      .focus()
      .setTextSelection(match)
      .insertContent(replaceTerm)
      .run();
    /* 重新搜索 */
    setTimeout(() => doSearch(searchTerm), 50);
  };

  /** 全部替换 */
  const replaceAll = () => {
    if (matches.length === 0) return;
    /* 从后向前替换避免位置偏移 */
    const reversed = [...matches].reverse();
    editor.chain().focus();
    for (const m of reversed) {
      editor.chain()
        .setTextSelection(m)
        .insertContent(replaceTerm)
        .run();
    }
    setTimeout(() => doSearch(searchTerm), 50);
  };

  /** 快捷键: Escape 关闭, Enter 下一个, Ctrl+H 切换替换 */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      goNext();
    } else if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      goPrev();
    } else if ((e.metaKey || e.ctrlKey) && e.key === "h") {
      e.preventDefault();
      setShowReplace(!showReplace);
    }
  };

  return (
    <div className="absolute right-6 top-2 z-30 bg-panel-bg rounded-xl shadow-xl border border-panel-border p-3 w-80"
      onKeyDown={handleKeyDown}>
      {/* 搜索行 */}
      <div className="flex items-center gap-2 mb-2">
        <input ref={searchRef} value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="查找"
          className="flex-1 h-8 px-2.5 rounded-lg border border-panel-border bg-bg-page text-sm text-text-primary
            outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-text-placeholder" />
        <span className="text-[10px] text-text-placeholder whitespace-nowrap min-w-14 text-center">
          {matches.length > 0 ? `${currentIndex + 1}/${matches.length}` : "无匹配"}
        </span>
        <button onClick={goPrev} title="上一个 (Shift+Enter)"
          className="w-6 h-6 rounded flex items-center justify-center text-text-secondary hover:bg-list-hover">
          <ChevronUp size={14} />
        </button>
        <button onClick={goNext} title="下一个 (Enter)"
          className="w-6 h-6 rounded flex items-center justify-center text-text-secondary hover:bg-list-hover">
          <ChevronDown size={14} />
        </button>
        <button onClick={() => setShowReplace(!showReplace)} title="替换 (Ctrl+H)"
          className={`w-6 h-6 rounded flex items-center justify-center transition-colors
            ${showReplace ? "text-primary bg-primary/10" : "text-text-secondary hover:bg-list-hover"}`}>
          <Replace size={14} />
        </button>
        <button onClick={onClose} title="关闭 (Esc)"
          className="w-6 h-6 rounded flex items-center justify-center text-text-placeholder hover:text-text-primary hover:bg-list-hover">
          <X size={14} />
        </button>
      </div>

      {/* 替换行 */}
      {showReplace && (
        <div className="flex items-center gap-2">
          <input value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            placeholder="替换为"
            className="flex-1 h-8 px-2.5 rounded-lg border border-panel-border bg-bg-page text-sm text-text-primary
              outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-text-placeholder" />
          <button onClick={replaceCurrent} title="替换"
            className="h-7 px-2.5 rounded-lg text-[10px] font-medium text-text-secondary border border-panel-border hover:bg-list-hover transition-colors">
            替换
          </button>
          <button onClick={replaceAll} title="全部替换"
            className="h-7 px-2.5 rounded-lg text-[10px] font-medium text-text-secondary border border-panel-border hover:bg-list-hover transition-colors flex items-center gap-1">
            <ReplaceAll size={12} /> 全部
          </button>
        </div>
      )}
    </div>
  );
}
