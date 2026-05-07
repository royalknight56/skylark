/**
 * 文档编辑器组件
 * 基于 TipTap (ProseMirror) 的现代文档编辑器
 * @author skylark
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  onSave?: (content: string, title: string) => void | Promise<void>;
  onShare?: (doc: Document) => void;
}

interface DocDraft {
  title: string;
  content: string;
  updatedAt: string;
  serverUpdatedAt: string;
}

const AUTOSAVE_DELAY_MS = 1800;
const DRAFT_WRITE_DELAY_MS = 300;

function getDraftKey(docId: string) {
  return `skylark:doc-draft:${docId}`;
}

function readDraft(docId: string): DocDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getDraftKey(docId));
    return raw ? (JSON.parse(raw) as DocDraft) : null;
  } catch {
    return null;
  }
}

function writeDraft(docId: string, draft: DocDraft) {
  try {
    window.localStorage.setItem(getDraftKey(docId), JSON.stringify(draft));
  } catch {
    // localStorage may be unavailable or full; editing should continue.
  }
}

function clearDraft(docId: string) {
  try {
    window.localStorage.removeItem(getDraftKey(docId));
  } catch {
    // ignore
  }
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
  const [hasLocalDraft, setHasLocalDraft] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const isHydratingRef = useRef(false);
  const latestRef = useRef({ title: doc.title, content: doc.content || "" });
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const persistDraft = useCallback((content: string, nextTitle = title) => {
    latestRef.current = { title: nextTitle, content };
    setHasLocalDraft(true);
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      writeDraft(doc.id, {
        title: latestRef.current.title,
        content: latestRef.current.content,
        updatedAt: new Date().toISOString(),
        serverUpdatedAt: doc.updated_at,
      });
    }, DRAFT_WRITE_DELAY_MS);
  }, [doc.id, doc.updated_at, title]);

  /* 文档切换时更新内容 */
  useEffect(() => {
    setLastSaved(doc.updated_at);
    setSaveError(false);

    const draft = readDraft(doc.id);
    const draftIsNewer =
      draft && (!draft.serverUpdatedAt || new Date(draft.updatedAt).getTime() > new Date(doc.updated_at).getTime());
    const nextTitle = draftIsNewer ? draft.title : doc.title;
    const nextContent = draftIsNewer ? draft.content : (doc.content || "");

    setTitle(nextTitle);
    setHasLocalDraft(!!draftIsNewer);
    latestRef.current = { title: nextTitle, content: nextContent };

    if (editor && doc.content !== undefined) {
      isHydratingRef.current = true;
      editor.commands.setContent(nextContent);
      queueMicrotask(() => { isHydratingRef.current = false; });
    }
  }, [doc.id, doc.title, doc.content, doc.updated_at, editor]);

  /* 内容变更：先本地缓存，再防抖自动保存 */
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      if (isHydratingRef.current) return;
      const content = editor.getHTML();
      persistDraft(content);
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = setTimeout(() => {
        handleSave();
      }, AUTOSAVE_DELAY_MS);
    };

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [editor, persistDraft]);

  /* 关闭页面前尽量同步最后一次本地草稿写入 */
  useEffect(() => {
    const flushDraft = () => {
      if (!hasLocalDraft) return;
      writeDraft(doc.id, {
        title: latestRef.current.title,
        content: latestRef.current.content,
        updatedAt: new Date().toISOString(),
        serverUpdatedAt: doc.updated_at,
      });
    };
    window.addEventListener("beforeunload", flushDraft);
    return () => {
      flushDraft();
      window.removeEventListener("beforeunload", flushDraft);
    };
  }, [doc.id, doc.updated_at, hasLocalDraft]);

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
    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current);
      draftTimerRef.current = null;
    }
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    setIsSaving(true);
    const content = editor.getHTML();
    const nextTitle = latestRef.current.title || title;
    const savedSnapshot = { title: nextTitle, content };
    latestRef.current = { title: nextTitle, content };
    try {
      if (onSave) {
        await onSave(content, nextTitle);
      } else {
        const res = await fetch(`/api/docs/${doc.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, title: nextTitle }),
        });
        if (!res.ok) throw new Error("save failed");
      }
      const latest = latestRef.current;
      if (latest.title === savedSnapshot.title && latest.content === savedSnapshot.content) {
        clearDraft(doc.id);
        setHasLocalDraft(false);
      } else {
        writeDraft(doc.id, {
          title: latest.title,
          content: latest.content,
          updatedAt: new Date().toISOString(),
          serverUpdatedAt: doc.updated_at,
        });
        setHasLocalDraft(true);
      }
      setSaveError(false);
      setLastSaved(new Date().toISOString());
    } catch {
      writeDraft(doc.id, {
        title: nextTitle,
        content,
        updatedAt: new Date().toISOString(),
        serverUpdatedAt: doc.updated_at,
      });
      setHasLocalDraft(true);
      setSaveError(true);
    }
    finally { setIsSaving(false); }
  }, [editor, doc.id, doc.updated_at, title, onSave]);

  const handleTitleChange = (nextTitle: string) => {
    setTitle(nextTitle);
    const content = editor?.getHTML() || latestRef.current.content;
    persistDraft(content, nextTitle);
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      handleSave();
    }, AUTOSAVE_DELAY_MS);
  };

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
            onChange={(e) => handleTitleChange(e.target.value)}
            readOnly={isReadonly}
            className="text-sm md:text-base font-semibold text-text-primary bg-transparent border-none outline-none flex-1 min-w-0"
            placeholder="无标题文档"
          />
        </div>
        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          {/* 保存时间 — 移动端隐藏 */}
          <span className="text-xs text-text-placeholder hidden md:flex items-center gap-1">
            <Clock size={12} />
            {isSaving
              ? "保存中..."
              : saveError
                ? "离线草稿已保留"
                : hasLocalDraft
                  ? "本地草稿待同步"
                  : lastSaved
                    ? `保存于 ${formatTime(lastSaved)}`
                    : "未保存"}
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
