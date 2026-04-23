/**
 * 消息输入框组件
 * 支持文本输入、文件上传、表情
 * @author skylark
 */

"use client";

import { useState, useRef, useCallback } from "react";
import { Smile, Paperclip, Send, Image as ImageIcon } from "lucide-react";

interface MessageInputProps {
  onSend: (content: string, type?: string) => void;
  onFileUpload?: (file: File) => void;
  disabled?: boolean;
}

export default function MessageInput({ onSend, onFileUpload, disabled }: MessageInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** 发送文本消息 */
  const handleSend = useCallback(() => {
    const content = text.trim();
    if (!content) return;
    onSend(content, "text");
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, onSend]);

  /** 键盘快捷键：Enter 发送，Shift+Enter 换行 */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /** 自适应高度 */
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  /** 文件选择 */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
    e.target.value = "";
  };

  return (
    <div className="border-t border-panel-border bg-panel-bg px-4 py-3">
      {/* 工具栏 */}
      <div className="flex items-center gap-1 mb-2">
        <button
          className="w-7 h-7 rounded flex items-center justify-center text-text-secondary
            hover:bg-list-hover hover:text-text-primary transition-colors"
          title="表情"
        >
          <Smile size={18} />
        </button>
        <button
          className="w-7 h-7 rounded flex items-center justify-center text-text-secondary
            hover:bg-list-hover hover:text-text-primary transition-colors"
          title="图片"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon size={18} />
        </button>
        <button
          className="w-7 h-7 rounded flex items-center justify-center text-text-secondary
            hover:bg-list-hover hover:text-text-primary transition-colors"
          title="文件"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip size={18} />
        </button>
      </div>

      {/* 输入框 + 发送按钮 */}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none border-none outline-none bg-transparent text-sm
            text-text-primary placeholder:text-text-placeholder leading-5 py-1
            max-h-[120px] overflow-y-auto"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0
            ${
              text.trim()
                ? "bg-primary text-white hover:bg-primary-hover"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
        >
          <Send size={16} />
        </button>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
      />
    </div>
  );
}
