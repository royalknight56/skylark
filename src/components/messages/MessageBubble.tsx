/**
 * 消息气泡组件
 * 支持文本消息、图片消息和文件消息
 * @author skylark
 */

"use client";

import Avatar from "@/components/ui/Avatar";
import { FileIcon, Download } from "lucide-react";
import type { Message } from "@/lib/types";

interface MessageBubbleProps {
  message: Message;
  isSelf: boolean;
  showAvatar?: boolean;
  showName?: boolean;
}

/** 格式化文件大小 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

/** 格式化消息时间 */
function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

export default function MessageBubble({
  message,
  isSelf,
  showAvatar = true,
  showName = true,
}: MessageBubbleProps) {
  const senderName = message.sender?.name || "未知用户";

  // 系统消息居中显示
  if (message.type === "system") {
    return (
      <div className="flex justify-center py-2">
        <span className="text-xs text-text-placeholder bg-bg-page px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 px-4 py-1 ${isSelf ? "flex-row-reverse" : ""}`}>
      {/* 头像 */}
      {showAvatar ? (
        <Avatar name={senderName} avatarUrl={message.sender?.avatar_url} size="sm" className="mt-1" />
      ) : (
        <div className="w-8 flex-shrink-0" />
      )}

      {/* 消息内容 */}
      <div className={`max-w-[60%] ${isSelf ? "items-end" : "items-start"} flex flex-col`}>
        {/* 发送者名称 */}
        {showName && !isSelf && (
          <span className="text-xs text-text-secondary mb-1 px-1">{senderName}</span>
        )}

        {/* 文本消息 */}
        {message.type === "text" && (
          <div
            className={`px-3 py-2 rounded-lg text-sm leading-relaxed break-words whitespace-pre-wrap
              ${isSelf ? "bg-bg-bubble-self text-text-primary" : "bg-bg-bubble-other text-text-primary shadow-sm"}`}
          >
            {message.content}
          </div>
        )}

        {/* 图片消息 */}
        {message.type === "image" && (
          <div className="rounded-lg overflow-hidden shadow-sm max-w-xs">
            <img
              src={message.attachment?.url || message.content}
              alt="图片"
              className="max-w-full h-auto"
            />
          </div>
        )}

        {/* 文件消息 */}
        {message.type === "file" && message.attachment && (
          <div
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg min-w-[200px]
              ${isSelf ? "bg-bg-bubble-self" : "bg-bg-bubble-other shadow-sm"}`}
          >
            <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0">
              <FileIcon size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {message.attachment.name}
              </p>
              <p className="text-xs text-text-secondary">
                {formatFileSize(message.attachment.size)}
              </p>
            </div>
            <button className="text-text-secondary hover:text-primary transition-colors">
              <Download size={16} />
            </button>
          </div>
        )}

        {/* 时间戳 */}
        <span className={`text-[10px] text-text-placeholder mt-0.5 px-1 ${isSelf ? "text-right" : ""}`}>
          {formatMessageTime(message.created_at)}
        </span>
      </div>
    </div>
  );
}
