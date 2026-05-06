/**
 * 文档编辑器工具栏
 * 分组按钮布局，支持激活状态反馈
 * @author skylark
 */

"use client";

import { useCallback, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Undo2, Redo2,
  Bold, Italic, Underline, Strikethrough, Code,
  Highlighter, Palette,
  Heading1, Heading2, Heading3, Heading4,
  Pilcrow, Quote,
  List, ListOrdered, ListChecks,
  AlignLeft, AlignCenter, AlignRight,
  Indent, Outdent,
  Link2, ImagePlus, Minus, CodeSquare,
  Table, Columns2,
  BookOpen, Pencil,
  Search,
  Info,
  ChevronRight, Video, GitBranch, BarChart3,
} from "lucide-react";
import EmojiPicker from "./EmojiPicker";

interface EditorToolbarProps {
  editor: Editor;
  isReadonly: boolean;
  onToggleReadonly: () => void;
  onToggleSearch: () => void;
  onInsertLink: () => void;
  onInsertImage: () => void;
}

/** 文字颜色预设 */
const TEXT_COLORS = [
  { label: "默认", value: "" },
  { label: "红色", value: "#e03e3e" },
  { label: "橙色", value: "#d9730d" },
  { label: "黄色", value: "#cb8600" },
  { label: "绿色", value: "#0f7b6c" },
  { label: "蓝色", value: "#0b6e99" },
  { label: "紫色", value: "#6940a5" },
  { label: "灰色", value: "#9b9a97" },
];

/** 高亮背景色预设 */
const BG_COLORS = [
  { label: "无", value: "" },
  { label: "黄色", value: "#fef08a" },
  { label: "绿色", value: "#bbf7d0" },
  { label: "蓝色", value: "#bfdbfe" },
  { label: "紫色", value: "#e9d5ff" },
  { label: "粉色", value: "#fecdd3" },
  { label: "橙色", value: "#fed7aa" },
  { label: "灰色", value: "#e5e7eb" },
];

export default function EditorToolbar({
  editor,
  isReadonly,
  onToggleReadonly,
  onToggleSearch,
  onInsertLink,
  onInsertImage,
}: EditorToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);

  const btn = useCallback(
    (active: boolean, onClick: () => void) => ({
      className: `w-7 h-7 md:w-8 md:h-8 rounded flex items-center justify-center transition-colors
        ${active
          ? "bg-primary/10 text-primary"
          : "text-text-secondary hover:bg-list-hover hover:text-text-primary"}`,
      onClick,
    }),
    []
  );

  if (isReadonly) return null;

  /** 当前段落格式标签 */
  const headingLabel = editor.isActive("heading", { level: 1 }) ? "H1"
    : editor.isActive("heading", { level: 2 }) ? "H2"
    : editor.isActive("heading", { level: 3 }) ? "H3"
    : editor.isActive("heading", { level: 4 }) ? "H4"
    : "正文";

  return (
    <div className="h-10 px-1.5 md:px-3 flex items-center gap-0 md:gap-0.5 border-b border-panel-border shrink-0 overflow-x-auto bg-panel-bg">
      {/* 撤销/重做 */}
      <button {...btn(false, () => editor.chain().focus().undo().run())}
        disabled={!editor.can().undo()} title="撤销 (Ctrl+Z)">
        <Undo2 size={15} />
      </button>
      <button {...btn(false, () => editor.chain().focus().redo().run())}
        disabled={!editor.can().redo()} title="重做 (Ctrl+Shift+Z)">
        <Redo2 size={15} />
      </button>

      <Divider />

      {/* 段落格式下拉 */}
      <div className="relative">
        <button
          onClick={() => setShowHeadingMenu(!showHeadingMenu)}
          className="h-8 px-2 rounded text-xs font-medium text-text-secondary hover:bg-list-hover flex items-center gap-1 min-w-14"
          title="段落格式"
        >
          <Pilcrow size={14} /> {headingLabel}
        </button>
        {showHeadingMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowHeadingMenu(false)} />
            <div className="absolute left-0 top-9 w-36 bg-panel-bg rounded-lg shadow-lg border border-panel-border z-50 py-1">
              {[
                { label: "正文", action: () => editor.chain().focus().setParagraph().run() },
                { label: "标题 1", action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), icon: Heading1 },
                { label: "标题 2", action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), icon: Heading2 },
                { label: "标题 3", action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), icon: Heading3 },
                { label: "标题 4", action: () => editor.chain().focus().toggleHeading({ level: 4 }).run(), icon: Heading4 },
              ].map((item) => (
                <button key={item.label}
                  onClick={() => { item.action(); setShowHeadingMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-list-hover transition-colors">
                  {item.icon ? <item.icon size={14} /> : <Pilcrow size={14} />}
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <Divider />

      {/* 文本格式 */}
      <button {...btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run())} title="加粗 (Ctrl+B)">
        <Bold size={15} />
      </button>
      <button {...btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run())} title="斜体 (Ctrl+I)">
        <Italic size={15} />
      </button>
      <button {...btn(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run())} title="下划线 (Ctrl+U)">
        <Underline size={15} />
      </button>
      <button {...btn(editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run())} title="删除线">
        <Strikethrough size={15} />
      </button>
      <button {...btn(editor.isActive("code"), () => editor.chain().focus().toggleCode().run())} title="行内代码">
        <Code size={15} />
      </button>

      {/* 文字颜色 */}
      <div className="relative">
        <button {...btn(false, () => setShowColorPicker(!showColorPicker))} title="文字颜色">
          <Palette size={15} />
        </button>
        {showColorPicker && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
            <div className="absolute left-0 top-9 w-36 bg-panel-bg rounded-lg shadow-lg border border-panel-border z-50 py-2 px-2">
              <p className="text-[10px] text-text-placeholder mb-1 px-1">文字颜色</p>
              <div className="grid grid-cols-4 gap-1">
                {TEXT_COLORS.map((c) => (
                  <button key={c.label}
                    onClick={() => {
                      if (c.value) editor.chain().focus().setColor(c.value).run();
                      else editor.chain().focus().unsetColor().run();
                      setShowColorPicker(false);
                    }}
                    className="w-7 h-7 rounded border border-panel-border flex items-center justify-center text-xs hover:scale-110 transition-transform"
                    title={c.label}
                    style={{ color: c.value || undefined }}
                  >
                    A
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 高亮 */}
      <div className="relative">
        <button {...btn(editor.isActive("highlight"), () => setShowBgPicker(!showBgPicker))} title="高亮背景色">
          <Highlighter size={15} />
        </button>
        {showBgPicker && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowBgPicker(false)} />
            <div className="absolute left-0 top-9 w-36 bg-panel-bg rounded-lg shadow-lg border border-panel-border z-50 py-2 px-2">
              <p className="text-[10px] text-text-placeholder mb-1 px-1">高亮颜色</p>
              <div className="grid grid-cols-4 gap-1">
                {BG_COLORS.map((c) => (
                  <button key={c.label}
                    onClick={() => {
                      if (c.value) editor.chain().focus().toggleHighlight({ color: c.value }).run();
                      else editor.chain().focus().unsetHighlight().run();
                      setShowBgPicker(false);
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

      <Divider />

      {/* 引用 */}
      <button {...btn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run())} title="引用">
        <Quote size={15} />
      </button>

      {/* 列表 */}
      <button {...btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run())} title="无序列表">
        <List size={15} />
      </button>
      <button {...btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run())} title="有序列表">
        <ListOrdered size={15} />
      </button>
      <button {...btn(editor.isActive("taskList"), () => editor.chain().focus().toggleTaskList().run())} title="任务列表">
        <ListChecks size={15} />
      </button>

      <Divider />

      {/* 对齐 */}
      <button {...btn(editor.isActive({ textAlign: "left" }), () => editor.chain().focus().setTextAlign("left").run())} title="左对齐">
        <AlignLeft size={15} />
      </button>
      <button {...btn(editor.isActive({ textAlign: "center" }), () => editor.chain().focus().setTextAlign("center").run())} title="居中">
        <AlignCenter size={15} />
      </button>
      <button {...btn(editor.isActive({ textAlign: "right" }), () => editor.chain().focus().setTextAlign("right").run())} title="右对齐">
        <AlignRight size={15} />
      </button>

      {/* 缩进 — 移动端隐藏 */}
      <button {...btn(false, () => editor.chain().focus().sinkListItem("listItem").run())}
        title="增加缩进" className="hidden md:flex w-7 h-7 md:w-8 md:h-8 rounded items-center justify-center transition-colors text-text-secondary hover:bg-list-hover hover:text-text-primary">
        <Indent size={15} />
      </button>
      <button {...btn(false, () => editor.chain().focus().liftListItem("listItem").run())}
        title="减少缩进" className="hidden md:flex w-7 h-7 md:w-8 md:h-8 rounded items-center justify-center transition-colors text-text-secondary hover:bg-list-hover hover:text-text-primary">
        <Outdent size={15} />
      </button>

      <Divider />

      {/* 插入 */}
      <button {...btn(editor.isActive("link"), onInsertLink)} title="超链接 (Ctrl+K)">
        <Link2 size={15} />
      </button>
      <button {...btn(false, onInsertImage)} title="插入图片">
        <ImagePlus size={15} />
      </button>
      <button {...btn(false, () => editor.chain().focus().setHorizontalRule().run())} title="分割线">
        <Minus size={15} />
      </button>
      <button {...btn(editor.isActive("codeBlock"), () => editor.chain().focus().toggleCodeBlock().run())} title="代码块">
        <CodeSquare size={15} />
      </button>
      {/* 表格（下拉选择尺寸） */}
      <div className="relative">
        <button {...btn(editor.isActive("table"), () => setShowTableMenu(!showTableMenu))} title="插入表格">
          <Table size={15} />
        </button>
        {showTableMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowTableMenu(false)} />
            <div className="absolute left-0 top-9 w-36 bg-panel-bg rounded-lg shadow-lg border border-panel-border z-50 py-1">
              {[
                { label: "2 × 2 表格", rows: 2, cols: 2 },
                { label: "3 × 3 表格", rows: 3, cols: 3 },
                { label: "4 × 4 表格", rows: 4, cols: 4 },
                { label: "5 × 3 表格", rows: 5, cols: 3 },
              ].map((t) => (
                <button key={t.label}
                  onClick={() => {
                    editor.chain().focus().insertTable({ rows: t.rows, cols: t.cols, withHeaderRow: true }).run();
                    setShowTableMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-list-hover transition-colors">
                  <Table size={14} /> {t.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {/* 分栏 — 移动端隐藏 */}
      <button {...btn(false, () => editor.chain().focus().insertColumns(2).run())}
        title="分栏" className="hidden md:flex w-7 h-7 md:w-8 md:h-8 rounded items-center justify-center transition-colors text-text-secondary hover:bg-list-hover hover:text-text-primary">
        <Columns2 size={15} />
      </button>
      <button {...btn(false, () => editor.chain().focus().insertCallout("info").run())} title="提示块">
        <Info size={15} />
      </button>
      <button {...btn(false, () => editor.chain().focus().insertDetails().run())} title="折叠块">
        <ChevronRight size={15} />
      </button>
      {/* 视频/流程图/进度条 — 移动端隐藏 */}
      <button {...btn(false, () => {
        const url = prompt("请输入视频 URL（YouTube / Bilibili）：");
        if (url) editor.chain().focus().insertVideo(url).run();
      })} title="嵌入视频" className="hidden md:flex w-7 h-7 md:w-8 md:h-8 rounded items-center justify-center transition-colors text-text-secondary hover:bg-list-hover hover:text-text-primary">
        <Video size={15} />
      </button>
      <button {...btn(false, () => editor.chain().focus().insertMermaid().run())}
        title="流程图" className="hidden md:flex w-7 h-7 md:w-8 md:h-8 rounded items-center justify-center transition-colors text-text-secondary hover:bg-list-hover hover:text-text-primary">
        <GitBranch size={15} />
      </button>
      <button {...btn(false, () => {
        const val = prompt("进度百分比（0-100）：", "50");
        const num = parseInt(val || "50", 10);
        editor.chain().focus().insertProgress(isNaN(num) ? 50 : Math.min(100, Math.max(0, num))).run();
      })} title="进度条" className="hidden md:flex w-7 h-7 md:w-8 md:h-8 rounded items-center justify-center transition-colors text-text-secondary hover:bg-list-hover hover:text-text-primary">
        <BarChart3 size={15} />
      </button>

      {/* 表情 */}
      <EmojiPicker editor={editor} />

      <Divider />

      {/* 查找 */}
      <button {...btn(false, onToggleSearch)} title="查找替换 (Ctrl+F)">
        <Search size={15} />
      </button>

      {/* 阅读/编辑模式 — 移动端隐藏（顶栏已有） */}
      <button
        onClick={onToggleReadonly}
        className="h-8 px-2.5 rounded text-xs font-medium hidden md:flex items-center gap-1.5 ml-auto
          text-text-secondary hover:bg-list-hover transition-colors"
        title={isReadonly ? "切换到编辑模式" : "切换到阅读模式"}
      >
        {isReadonly ? <><Pencil size={14} /> 编辑</> : <><BookOpen size={14} /> 阅读</>}
      </button>
    </div>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-panel-border mx-0.5 shrink-0" />;
}
