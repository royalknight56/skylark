/**
 * 文档编辑器组件
 * 基于 TipTap (ProseMirror) 的飞书风格文档编辑器
 * @author skylark
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import {
  Save, Share2, Clock, MoreHorizontal,
  Copy, Check, ExternalLink, BookOpen, Pencil,
} from "lucide-react";
import EditorToolbar from "./editor/EditorToolbar";
import BubbleToolbar from "./editor/BubbleToolbar";
import SlashMenu from "./editor/SlashMenu";
import SearchReplace from "./editor/SearchReplace";
import TOCSidebar from "./editor/TOCSidebar";
import LinkModal from "./editor/LinkModal";
import TableMenu from "./editor/TableMenu";
import { Callout } from "./editor/extensions/callout";
import { Columns, Column } from "./editor/extensions/columns";
import { Details, DetailsSummary, DetailsContent } from "./editor/extensions/details";
import { Video } from "./editor/extensions/video";
import { MermaidBlock } from "./editor/extensions/mermaid";
import { ProgressBar } from "./editor/extensions/progress";
import type { Document } from "@/lib/types";
import "./editor/styles.css";

interface DocEditorProps {
  document: Document;
  onSave?: (content: string, title: string) => void;
  onShare?: (doc: Document) => void;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("zh-CN", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function DocEditor({ document: doc, onSave, onShare }: DocEditorProps) {
  const [title, setTitle] = useState(doc.title);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(doc.updated_at);
  const [isReadonly, setIsReadonly] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showTOC, setShowTOC] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyleKit,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder: "输入 / 唤起菜单，开始编写文档…" }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      Callout,
      Columns,
      Column,
      Details,
      DetailsSummary,
      DetailsContent,
      Video,
      MermaidBlock,
      ProgressBar,
    ],
    content: doc.content || "",
    editorProps: {
      attributes: { class: "tiptap-editor" },
    },
  });

  /* 文档切换时更新内容 */
  useEffect(() => {
    setTitle(doc.title);
    setLastSaved(doc.updated_at);
    if (editor && doc.content !== undefined) {
      editor.commands.setContent(doc.content || "");
    }
  }, [doc, editor]);

  /* 阅读/编辑模式切换 */
  useEffect(() => {
    editor?.setEditable(!isReadonly);
  }, [isReadonly, editor]);

  /* 快捷键 */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setShowSearch(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowLinkModal(true);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  /** 保存文档 */
  const handleSave = useCallback(async () => {
    if (!editor) return;
    setIsSaving(true);
    const content = editor.getHTML();
    try {
      if (onSave) {
        onSave(content, title);
      } else {
        await fetch(`/api/docs/${doc.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, title }),
        });
      }
      setLastSaved(new Date().toISOString());
    } catch { /* 静默失败 */ }
    finally { setIsSaving(false); }
  }, [editor, doc.id, title, onSave]);

  /** 插入链接回调 */
  const handleInsertLink = useCallback((url: string, text: string) => {
    if (!editor) return;
    if (text) {
      editor.chain().focus()
        .insertContent(`<a href="${url}" target="_blank">${text}</a>`)
        .run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
    setShowLinkModal(false);
  }, [editor]);

  /** 插入图片 */
  const handleInsertImage = useCallback(() => {
    const url = prompt("请输入图片 URL：");
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) {
    return (
      <div className="flex-1 flex items-center justify-center bg-panel-bg">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-panel-bg overflow-hidden">
      {/* 顶栏 */}
      <div className="h-12 md:h-14 px-3 md:px-6 flex items-center justify-between border-b border-panel-border shrink-0">
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            readOnly={isReadonly}
            className="text-sm md:text-base font-semibold text-text-primary bg-transparent border-none outline-none flex-1 min-w-0"
            placeholder="无标题文档"
          />
        </div>
        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          {/* 保存时间 — 移动端隐藏 */}
          <span className="text-xs text-text-placeholder hidden md:flex items-center gap-1">
            <Clock size={12} />
            {lastSaved ? `保存于 ${formatTime(lastSaved)}` : "未保存"}
          </span>

          {/* 阅读/编辑模式切换 */}
          <button
            onClick={() => setIsReadonly(!isReadonly)}
            className={`h-8 px-2 md:px-3 rounded-lg text-sm flex items-center gap-1.5 transition-colors
              ${isReadonly
                ? "bg-primary/10 text-primary hover:bg-primary/20"
                : "text-text-secondary hover:bg-list-hover"}`}
            title={isReadonly ? "切换到编辑模式" : "切换到阅读模式"}
          >
            {isReadonly ? <><Pencil size={14} /> <span className="hidden md:inline">编辑</span></> : <><BookOpen size={14} /> <span className="hidden md:inline">阅读</span></>}
          </button>

          {!isReadonly && (
            <button onClick={handleSave} disabled={isSaving}
              className="h-8 px-2 md:px-3 rounded-lg bg-primary text-white text-sm flex items-center gap-1.5
                hover:bg-primary-hover transition-colors disabled:opacity-50">
              <Save size={14} /> <span className="hidden md:inline">{isSaving ? "保存中..." : "保存"}</span>
            </button>
          )}

          <button onClick={() => onShare?.(doc)} title="发送给联系人"
            className="w-8 h-8 rounded-lg hidden md:flex items-center justify-center text-text-secondary hover:bg-list-hover transition-colors">
            <Share2 size={16} />
          </button>

          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:bg-list-hover transition-colors">
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-9 w-40 bg-panel-bg rounded-lg shadow-lg border border-panel-border z-50 py-1">
                  <button onClick={() => { setShowTOC(!showTOC); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-list-hover transition-colors">
                    <BookOpen size={12} /> {showTOC ? "隐藏目录" : "显示目录"}
                  </button>
                  {/* 分享按钮 — 移动端显示在菜单里 */}
                  <button
                    onClick={() => { onShare?.(doc); setShowMenu(false); }}
                    className="w-full flex md:hidden items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-list-hover transition-colors">
                    <Share2 size={12} /> 发送给联系人
                  </button>
                  <button
                    onClick={() => {
                      const link = `${window.location.origin}/docs/${doc.id}`;
                      navigator.clipboard.writeText(link);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-list-hover transition-colors">
                    {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                    {copied ? "已复制" : "复制链接"}
                  </button>
                  <button onClick={() => { window.open(`/docs/${doc.id}`, "_blank"); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-list-hover transition-colors">
                    <ExternalLink size={12} /> 在新页面打开
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 工具栏（阅读模式下隐藏） */}
      {!isReadonly && (
        <EditorToolbar
          editor={editor}
          isReadonly={isReadonly}
          onToggleReadonly={() => setIsReadonly(!isReadonly)}
          onToggleSearch={() => setShowSearch(!showSearch)}
          onInsertLink={() => setShowLinkModal(true)}
          onInsertImage={handleInsertImage}
        />
      )}

      {/* 查找替换 */}
      {showSearch && (
        <SearchReplace editor={editor} onClose={() => setShowSearch(false)} />
      )}

      {/* 编辑区域 + 目录 */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto relative">
          <div className="max-w-full md:max-w-3xl mx-auto px-4 py-4 md:px-12 md:py-8">
            <EditorContent editor={editor} />
          </div>
          {/* 表格浮动工具栏 */}
          {!isReadonly && <TableMenu editor={editor} />}
        </div>

        {/* 目录大纲 */}
        {showTOC && <TOCSidebar editor={editor} />}
      </div>

      {/* BubbleMenu — 选中文本浮动菜单 */}
      {!isReadonly && <BubbleToolbar editor={editor} onInsertLink={() => setShowLinkModal(true)} />}

      {/* SlashMenu — 斜杠命令 */}
      {!isReadonly && <SlashMenu editor={editor} />}

      {/* 链接弹窗 */}
      {showLinkModal && (
        <LinkModal
          editor={editor}
          onClose={() => setShowLinkModal(false)}
          onSubmit={handleInsertLink}
        />
      )}
    </div>
  );
}
