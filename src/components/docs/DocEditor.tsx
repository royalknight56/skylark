/**
 * 文档编辑器组件
 * 基于 contentEditable 的轻量级富文本编辑器
 * @author skylark
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Code,
  Save,
  MoreHorizontal,
  Share2,
  Clock,
} from "lucide-react";
import type { Document } from "@/lib/types";

interface DocEditorProps {
  document: Document;
  onSave?: (content: string, title: string) => void;
}

/** 格式化时间 */
function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DocEditor({ document: doc, onSave }: DocEditorProps) {
  const [title, setTitle] = useState(doc.title);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(doc.updated_at);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitle(doc.title);
    if (editorRef.current) {
      editorRef.current.innerHTML = doc.content || "";
    }
  }, [doc]);

  /** 执行富文本命令 */
  const execCommand = (command: string, value?: string) => {
    window.document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  /** 保存文档 */
  const handleSave = useCallback(async () => {
    if (!editorRef.current) return;
    setIsSaving(true);

    const content = editorRef.current.innerHTML;
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
    } catch {
      // 保存失败
    } finally {
      setIsSaving(false);
    }
  }, [doc.id, title, onSave]);

  /** 快捷键保存 */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
  };

  /** 工具栏按钮 */
  const ToolButton = ({
    icon: Icon,
    label,
    onClick,
  }: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      title={label}
      className="w-8 h-8 rounded flex items-center justify-center text-text-secondary
        hover:bg-list-hover hover:text-text-primary transition-colors"
    >
      <Icon size={16} />
    </button>
  );

  return (
    <div className="flex-1 flex flex-col bg-panel-bg overflow-hidden" onKeyDown={handleKeyDown}>
      {/* 顶栏 */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-panel-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-base font-semibold text-text-primary bg-transparent border-none outline-none"
            placeholder="无标题文档"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-placeholder flex items-center gap-1">
            <Clock size={12} />
            {lastSaved ? `保存于 ${formatTime(lastSaved)}` : "未保存"}
          </span>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 px-3 rounded-lg bg-primary text-white text-sm flex items-center gap-1.5
              hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            {isSaving ? "保存中..." : "保存"}
          </button>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:bg-list-hover transition-colors">
            <Share2 size={16} />
          </button>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:bg-list-hover transition-colors">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="h-10 px-6 flex items-center gap-0.5 border-b border-panel-border flex-shrink-0">
        <ToolButton icon={Heading1} label="标题1" onClick={() => execCommand("formatBlock", "h1")} />
        <ToolButton icon={Heading2} label="标题2" onClick={() => execCommand("formatBlock", "h2")} />
        <div className="w-px h-5 bg-panel-border mx-1" />
        <ToolButton icon={Bold} label="加粗" onClick={() => execCommand("bold")} />
        <ToolButton icon={Italic} label="斜体" onClick={() => execCommand("italic")} />
        <ToolButton icon={Underline} label="下划线" onClick={() => execCommand("underline")} />
        <div className="w-px h-5 bg-panel-border mx-1" />
        <ToolButton icon={List} label="无序列表" onClick={() => execCommand("insertUnorderedList")} />
        <ToolButton icon={ListOrdered} label="有序列表" onClick={() => execCommand("insertOrderedList")} />
        <div className="w-px h-5 bg-panel-border mx-1" />
        <ToolButton icon={Code} label="代码块" onClick={() => execCommand("formatBlock", "pre")} />
      </div>

      {/* 编辑区域 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-12 py-8">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="min-h-[500px] outline-none text-base text-text-primary leading-relaxed
              [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-4 [&>h1]:mt-6
              [&>h2]:text-xl [&>h2]:font-semibold [&>h2]:mb-3 [&>h2]:mt-5
              [&>p]:mb-3
              [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-3
              [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:mb-3
              [&>pre]:bg-gray-100 [&>pre]:rounded-lg [&>pre]:p-4 [&>pre]:mb-3 [&>pre]:font-mono [&>pre]:text-sm"
            dangerouslySetInnerHTML={{ __html: doc.content || "" }}
          />
        </div>
      </div>
    </div>
  );
}
