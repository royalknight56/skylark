/**
 * 选中文本浮动工具栏
 * 选中文本后弹出常用格式按钮
 * @author skylark
 */

"use client";

import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  Bold, Italic, Underline, Strikethrough,
  Code, Link2, Highlighter, Unlink,
} from "lucide-react";

interface BubbleToolbarProps {
  editor: Editor;
  onInsertLink: () => void;
}

export default function BubbleToolbar({ editor, onInsertLink }: BubbleToolbarProps) {
  const btn = (active: boolean, onClick: () => void, title: string) => (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 rounded flex items-center justify-center transition-colors
        ${active ? "bg-white/20 text-white" : "text-gray-300 hover:text-white hover:bg-white/10"}`}
    >
    </button>
  );

  return (
    <BubbleMenu editor={editor}>
      <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg shadow-xl px-1 py-1 border border-gray-700">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="加粗"
          className={`w-8 h-8 rounded flex items-center justify-center transition-colors
            ${editor.isActive("bold") ? "bg-white/20 text-white" : "text-gray-300 hover:text-white hover:bg-white/10"}`}
        >
          <Bold size={14} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="斜体"
          className={`w-8 h-8 rounded flex items-center justify-center transition-colors
            ${editor.isActive("italic") ? "bg-white/20 text-white" : "text-gray-300 hover:text-white hover:bg-white/10"}`}
        >
          <Italic size={14} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="下划线"
          className={`w-8 h-8 rounded flex items-center justify-center transition-colors
            ${editor.isActive("underline") ? "bg-white/20 text-white" : "text-gray-300 hover:text-white hover:bg-white/10"}`}
        >
          <Underline size={14} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="删除线"
          className={`w-8 h-8 rounded flex items-center justify-center transition-colors
            ${editor.isActive("strike") ? "bg-white/20 text-white" : "text-gray-300 hover:text-white hover:bg-white/10"}`}
        >
          <Strikethrough size={14} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="行内代码"
          className={`w-8 h-8 rounded flex items-center justify-center transition-colors
            ${editor.isActive("code") ? "bg-white/20 text-white" : "text-gray-300 hover:text-white hover:bg-white/10"}`}
        >
          <Code size={14} />
        </button>

        <div className="w-px h-5 bg-gray-600 mx-0.5" />

        <button
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          title="高亮"
          className={`w-8 h-8 rounded flex items-center justify-center transition-colors
            ${editor.isActive("highlight") ? "bg-white/20 text-white" : "text-gray-300 hover:text-white hover:bg-white/10"}`}
        >
          <Highlighter size={14} />
        </button>

        {editor.isActive("link") ? (
          <button
            onClick={() => editor.chain().focus().unsetLink().run()}
            title="取消链接"
            className="w-8 h-8 rounded flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-white/10 transition-colors"
          >
            <Unlink size={14} />
          </button>
        ) : (
          <button
            onClick={onInsertLink}
            title="添加链接"
            className="w-8 h-8 rounded flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Link2 size={14} />
          </button>
        )}
      </div>
    </BubbleMenu>
  );
}
