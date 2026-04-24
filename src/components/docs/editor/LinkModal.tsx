/**
 * 超链接编辑弹窗
 * 支持插入/编辑链接 URL 和文字
 * @author skylark
 */

"use client";

import { useState, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { Link2, X } from "lucide-react";

interface LinkModalProps {
  editor: Editor;
  onClose: () => void;
  onSubmit: (url: string, text: string) => void;
}

export default function LinkModal({ editor, onClose, onSubmit }: LinkModalProps) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const urlRef = useRef<HTMLInputElement>(null);

  /* 如果已选中文本或已有链接，预填 */
  useEffect(() => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    if (selectedText) setText(selectedText);

    const linkMark = editor.getAttributes("link");
    if (linkMark.href) setUrl(linkMark.href);

    setTimeout(() => urlRef.current?.focus(), 50);
  }, [editor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    /* 自动补全协议 */
    const finalUrl = /^https?:\/\//.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;
    onSubmit(finalUrl, text.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className="w-96 bg-panel-bg rounded-2xl shadow-xl border border-panel-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-text-primary font-semibold text-sm">
            <Link2 size={16} className="text-primary" />
            插入链接
          </div>
          <button onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center text-text-placeholder hover:text-text-primary hover:bg-list-hover transition-colors">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-text-secondary mb-1 block">链接地址</label>
            <input ref={urlRef} value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full h-9 px-3 rounded-lg border border-panel-border bg-bg-page text-sm text-text-primary
                outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-text-placeholder" />
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1 block">显示文字（可选）</label>
            <input value={text} onChange={(e) => setText(e.target.value)}
              placeholder="链接文字"
              className="w-full h-9 px-3 rounded-lg border border-panel-border bg-bg-page text-sm text-text-primary
                outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-text-placeholder" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="h-8 px-4 rounded-lg text-sm text-text-secondary hover:bg-list-hover transition-colors">
              取消
            </button>
            <button type="submit"
              className="h-8 px-4 rounded-lg bg-primary text-white text-sm hover:bg-primary-hover transition-colors disabled:opacity-50"
              disabled={!url.trim()}>
              确认
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
