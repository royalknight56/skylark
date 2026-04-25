/**
 * 表格浮动操作工具栏
 * 光标在表格内时显示，提供行列增删、合并拆分、背景色、标题切换、对齐、删除等操作
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Editor } from "@tiptap/react";
import {
  ArrowUpToLine, ArrowDownToLine, ArrowLeftToLine, ArrowRightToLine,
  Trash2,
  Merge, Split,
  Palette,
  PanelTop, PanelLeft,
  AlignLeft, AlignCenter, AlignRight,
  X,
} from "lucide-react";

interface TableMenuProps {
  editor: Editor;
}

/** 单元格背景色预设 */
const CELL_COLORS = [
  { label: "无", value: "" },
  { label: "浅蓝", value: "#dbeafe" },
  { label: "浅绿", value: "#dcfce7" },
  { label: "浅黄", value: "#fef9c3" },
  { label: "浅橙", value: "#ffedd5" },
  { label: "浅红", value: "#fee2e2" },
  { label: "浅紫", value: "#f3e8ff" },
  { label: "浅灰", value: "#f3f4f6" },
];

export default function TableMenu({ editor }: TableMenuProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  /** 检测光标是否在表格内，计算浮动位置 */
  const updatePosition = useCallback(() => {
    if (!editor.isActive("table")) {
      setVisible(false);
      setShowColorPicker(false);
      return;
    }

    setVisible(true);

    /* 找到表格 DOM 节点 */
    const { $anchor } = editor.state.selection;
    let depth = $anchor.depth;
    while (depth > 0) {
      const node = $anchor.node(depth);
      if (node.type.name === "table") break;
      depth--;
    }
    if (depth <= 0) return;

    const tablePos = $anchor.start(depth) - 1;
    const dom = editor.view.nodeDOM(tablePos);
    if (!dom || !(dom instanceof HTMLElement)) return;

    const tableEl = dom.tagName === "TABLE" ? dom : dom.querySelector("table");
    if (!tableEl) return;

    const scrollContainer = editor.view.dom.closest(".overflow-y-auto");
    if (!scrollContainer) return;

    const scrollRect = scrollContainer.getBoundingClientRect();
    const tableRect = tableEl.getBoundingClientRect();

    setPos({
      top: tableRect.top - scrollRect.top + scrollContainer.scrollTop - 42,
      left: tableRect.left - scrollRect.left + (tableRect.width / 2),
    });
  }, [editor]);

  useEffect(() => {
    editor.on("selectionUpdate", updatePosition);
    editor.on("update", updatePosition);
    return () => {
      editor.off("selectionUpdate", updatePosition);
      editor.off("update", updatePosition);
    };
  }, [editor, updatePosition]);

  if (!visible) return null;

  const canMerge = editor.can().mergeCells();
  const canSplit = editor.can().splitCell();

  return (
    <div
      ref={menuRef}
      className="absolute z-30 -translate-x-1/2 max-w-[calc(100vw-2rem)] md:max-w-none"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="flex items-center flex-wrap gap-0.5 bg-panel-bg rounded-lg shadow-lg border border-panel-border px-1.5 py-1">
        {/* 行操作 */}
        <TBtn icon={ArrowUpToLine} title="上方插入行"
          onClick={() => editor.chain().focus().addRowBefore().run()} />
        <TBtn icon={ArrowDownToLine} title="下方插入行"
          onClick={() => editor.chain().focus().addRowAfter().run()} />
        <TBtn icon={Trash2} title="删除行" danger
          onClick={() => editor.chain().focus().deleteRow().run()} />

        <Sep />

        {/* 列操作 */}
        <TBtn icon={ArrowLeftToLine} title="左侧插入列"
          onClick={() => editor.chain().focus().addColumnBefore().run()} />
        <TBtn icon={ArrowRightToLine} title="右侧插入列"
          onClick={() => editor.chain().focus().addColumnAfter().run()} />
        <TBtn icon={Trash2} title="删除列" danger
          onClick={() => editor.chain().focus().deleteColumn().run()} />

        <Sep />

        {/* 合并/拆分 */}
        <TBtn icon={Merge} title="合并单元格" disabled={!canMerge}
          onClick={() => editor.chain().focus().mergeCells().run()} />
        <TBtn icon={Split} title="拆分单元格" disabled={!canSplit}
          onClick={() => editor.chain().focus().splitCell().run()} />

        <Sep />

        {/* 背景色 */}
        <div className="relative">
          <TBtn icon={Palette} title="单元格背景色"
            onClick={() => setShowColorPicker(!showColorPicker)} />
          {showColorPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
              <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 top-9 w-36 bg-panel-bg rounded-lg shadow-lg border border-panel-border z-50 py-2 px-2">
                <p className="text-[10px] text-text-placeholder mb-1 px-1">背景色</p>
                <div className="grid grid-cols-4 gap-1">
                  {CELL_COLORS.map((c) => (
                    <button key={c.label}
                      onClick={() => {
                        if (c.value) {
                          editor.chain().focus().setCellAttribute("backgroundColor", c.value).run();
                        } else {
                          editor.chain().focus().setCellAttribute("backgroundColor", null).run();
                        }
                        setShowColorPicker(false);
                      }}
                      className="w-7 h-7 rounded border border-panel-border hover:scale-110 transition-transform"
                      title={c.label}
                      style={{ background: c.value || "#fff" }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <Sep />

        {/* 标题行/列切换 */}
        <TBtn icon={PanelTop} title="切换标题行"
          active={editor.isActive("tableHeader")}
          onClick={() => editor.chain().focus().toggleHeaderRow().run()} />
        <TBtn icon={PanelLeft} title="切换标题列"
          onClick={() => editor.chain().focus().toggleHeaderColumn().run()} />

        <Sep />

        {/* 对齐 */}
        <TBtn icon={AlignLeft} title="左对齐"
          onClick={() => editor.chain().focus().setTextAlign("left").run()} />
        <TBtn icon={AlignCenter} title="居中"
          onClick={() => editor.chain().focus().setTextAlign("center").run()} />
        <TBtn icon={AlignRight} title="右对齐"
          onClick={() => editor.chain().focus().setTextAlign("right").run()} />

        <Sep />

        {/* 删除表格 */}
        <TBtn icon={X} title="删除表格" danger
          onClick={() => editor.chain().focus().deleteTable().run()} />
      </div>
    </div>
  );
}

/** 工具栏按钮 */
function TBtn({
  icon: Icon,
  title,
  onClick,
  danger,
  disabled,
  active,
}: {
  icon: React.ElementType;
  title: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-7 h-7 rounded flex items-center justify-center transition-colors
        ${disabled ? "text-text-placeholder opacity-40 cursor-not-allowed" : ""}
        ${danger && !disabled ? "text-red-500 hover:bg-red-50" : ""}
        ${active ? "bg-primary/10 text-primary" : ""}
        ${!danger && !disabled && !active ? "text-text-secondary hover:bg-list-hover hover:text-text-primary" : ""}`}
    >
      <Icon size={14} />
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-panel-border mx-0.5 shrink-0 hidden md:block" />;
}
