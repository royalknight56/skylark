/**
 * 文档目录大纲侧边栏
 * 从编辑器内容实时解析 heading 节点，生成可导航的目录
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import { ListTree, ChevronRight, X } from "lucide-react";

interface TOCSidebarProps {
  editor: Editor;
}

interface HeadingItem {
  id: string;
  text: string;
  level: number;
  pos: number;
}

export default function TOCSidebar({ editor }: TOCSidebarProps) {
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [activeId, setActiveId] = useState("");

  /** 从编辑器文档解析所有标题 */
  const parseHeadings = useCallback(() => {
    const items: HeadingItem[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "heading") {
        const text = node.textContent;
        const level = node.attrs.level as number;
        const id = `heading-${pos}`;
        items.push({ id, text, level, pos });
      }
    });
    setHeadings(items);
  }, [editor]);

  /* 初始解析 + 监听编辑器变化 */
  useEffect(() => {
    parseHeadings();
    editor.on("update", parseHeadings);
    return () => { editor.off("update", parseHeadings); };
  }, [editor, parseHeadings]);

  /** 点击标题项，滚动到对应位置 */
  const scrollToHeading = (item: HeadingItem) => {
    editor.chain().focus().setTextSelection(item.pos).run();

    const coords = editor.view.coordsAtPos(item.pos);
    const scrollContainer = editor.view.dom.closest(".overflow-y-auto");
    if (scrollContainer) {
      const rect = scrollContainer.getBoundingClientRect();
      const offset = coords.top - rect.top - 60;
      scrollContainer.scrollBy({ top: offset, behavior: "smooth" });
    }
    setActiveId(item.id);
  };

  /** 缩进级别映射 */
  const indentClass = (level: number) => {
    switch (level) {
      case 1: return "pl-0 font-semibold text-xs";
      case 2: return "pl-3 font-medium text-xs";
      case 3: return "pl-6 text-xs";
      case 4: return "pl-9 text-xs";
      default: return "pl-0 text-xs";
    }
  };

  return (
    <div className="w-56 border-l border-panel-border bg-panel-bg shrink-0 flex flex-col overflow-hidden">
      {/* 标题 */}
      <div className="h-10 px-3 flex items-center gap-2 border-b border-panel-border shrink-0">
        <ListTree size={14} className="text-text-secondary" />
        <span className="text-xs font-semibold text-text-primary">目录</span>
      </div>

      {/* 目录列表 */}
      <div className="flex-1 overflow-y-auto py-2">
        {headings.length === 0 ? (
          <p className="px-3 py-4 text-[10px] text-text-placeholder text-center">
            暂无标题。使用 H1-H4 创建章节标题后，目录将自动生成。
          </p>
        ) : (
          headings.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToHeading(item)}
              className={`w-full text-left px-3 py-1.5 transition-colors hover:bg-list-hover truncate
                ${indentClass(item.level)}
                ${activeId === item.id ? "text-primary bg-primary/5" : "text-text-secondary"}`}
            >
              {item.text || "(空标题)"}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
