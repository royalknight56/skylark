/**
 * 消息气泡组件
 * 支持文本/图片/文件/撤回消息，含已读状态 + 右键撤回 + 表情回复
 * @author skylark
 */

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import { FileIcon, FileText, Table2, Download, RotateCcw, Check, CheckCheck, SmilePlus, ExternalLink } from "lucide-react";
import type { Message, MessageReadInfo, MessageReaction } from "@/lib/types";

/** 快捷表情列表 */
const QUICK_EMOJIS = ["👍", "❤️", "😄", "🎉", "👀", "🙏", "🔥", "💯", "😂", "👏", "😮", "🤔"];

interface MessageBubbleProps {
  message: Message;
  isSelf: boolean;
  showAvatar?: boolean;
  showName?: boolean;
  conversationType?: "direct" | "group";
  onRecall?: (messageId: string) => void;
  /** 表情回复回调 */
  onReaction?: (messageId: string, emoji: string) => void;
  isGroupOwner?: boolean;
  currentUserId?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

const RECALL_LIMIT_MS = 24 * 60 * 60 * 1000;

export default function MessageBubble({
  message,
  isSelf,
  showAvatar = true,
  showName = true,
  conversationType = "direct",
  onRecall,
  onReaction,
  isGroupOwner = false,
  currentUserId,
}: MessageBubbleProps) {
  const senderName = message.sender?.name || "未知用户";
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const [showReaders, setShowReaders] = useState(false);
  const [readers, setReaders] = useState<MessageReadInfo[]>([]);
  const [loadingReaders, setLoadingReaders] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!showContextMenu) return;
    const handler = () => setShowContextMenu(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showContextMenu]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (message.recalled || message.type === "system") return;

    const canRecall =
      isSelf
        ? Date.now() - new Date(message.created_at).getTime() < RECALL_LIMIT_MS
        : isGroupOwner;

    if (!canRecall || !onRecall) return;

    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleRecall = () => {
    setShowContextMenu(false);
    if (onRecall) onRecall(message.id);
  };

  const handleShowReaders = async () => {
    if (conversationType !== "group" || !isSelf) return;
    if (showReaders) { setShowReaders(false); return; }
    setLoadingReaders(true);
    setShowReaders(true);
    try {
      const res = await fetch(
        `/api/conversations/${message.conversation_id}/messages/${message.id}/readers`
      );
      const data = (await res.json()) as {
        success: boolean;
        data?: { readers: MessageReadInfo[]; read_count: number };
      };
      if (data.success && data.data) setReaders(data.data.readers);
    } catch { /* ignore */ } finally { setLoadingReaders(false); }
  };

  /** 点击表情 */
  const handleEmojiClick = (emoji: string) => {
    setShowEmojiPicker(false);
    if (onReaction) onReaction(message.id, emoji);
  };

  /** 点击消息下方的表情标签（toggle 自己的表情） */
  const handleReactionTagClick = (emoji: string) => {
    if (onReaction) onReaction(message.id, emoji);
  };

  // 已撤回
  if (message.recalled) {
    const recallerName = message.recaller?.name || message.sender?.name || "用户";
    return (
      <div className="flex justify-center py-1.5">
        <span className="text-xs text-text-placeholder bg-bg-page px-3 py-1 rounded-full">
          {recallerName} 撤回了一条消息
        </span>
      </div>
    );
  }

  // 系统消息
  if (message.type === "system") {
    return (
      <div className="flex justify-center py-2">
        <span className="text-xs text-text-placeholder bg-bg-page px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  const renderReadStatus = () => {
    if (!isSelf) return null;
    if (conversationType === "direct") {
      return message.is_read ? (
        <CheckCheck size={12} className="text-primary" />
      ) : (
        <Check size={12} className="text-text-placeholder" />
      );
    }
    const readCount = message.read_count || 0;
    return (
      <button
        onClick={handleShowReaders}
        className="text-[10px] text-text-placeholder hover:text-primary transition-colors cursor-pointer"
      >
        {readCount > 0 ? `${readCount}人已读` : "未读"}
      </button>
    );
  };

  const reactions = message.reactions || [];

  /** 渲染表情回复标签区 */
  const renderReactions = () => {
    if (reactions.length === 0) return null;
    return (
      <div className={`flex flex-wrap gap-1 mt-1 px-0.5 ${isSelf ? "justify-end" : ""}`}>
        {reactions.map((r) => {
          const isMine = r.is_self || r.users.some((u) => u.user_id === currentUserId);
          const names = r.users.map((u) => u.name).join("、");
          return (
            <button
              key={r.emoji}
              onClick={() => handleReactionTagClick(r.emoji)}
              title={names}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors
                ${isMine
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-bg-page border-transparent text-text-secondary hover:bg-list-hover"
                }`}
            >
              <span>{r.emoji}</span>
              <span className="text-[10px]">{r.count}</span>
            </button>
          );
        })}
        {/* 追加表情按钮 */}
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="inline-flex items-center px-1 py-0.5 rounded-full text-xs border border-transparent
            text-text-placeholder hover:bg-list-hover transition-colors"
          title="添加表情"
        >
          <SmilePlus size={12} />
        </button>
      </div>
    );
  };

  return (
    <div
      className={`group relative flex gap-2 px-4 py-1 ${isSelf ? "flex-row-reverse" : ""}`}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowEmojiPicker(false); }}
    >
      {/* 头像 */}
      {showAvatar ? (
        <Avatar name={senderName} avatarUrl={message.sender?.avatar_url} size="sm" className="mt-1" />
      ) : (
        <div className="w-8 shrink-0" />
      )}

      {/* 消息内容 */}
      <div className={`max-w-[60%] ${isSelf ? "items-end" : "items-start"} flex flex-col`}>
        {showName && !isSelf && (
          <span className="text-xs text-text-secondary mb-1 px-1">{senderName}</span>
        )}

        {/* 消息体（含悬停快捷操作） */}
        <div className="relative">
          {/* 文本 */}
          {message.type === "text" && (
            <div
              className={`px-3 py-2 rounded-lg text-sm leading-relaxed break-words whitespace-pre-wrap
                ${isSelf ? "bg-bg-bubble-self text-text-primary" : "bg-bg-bubble-other text-text-primary shadow-sm"}`}
            >
              {message.content}
            </div>
          )}

          {/* 图片 */}
          {message.type === "image" && (
            <div className="rounded-lg overflow-hidden shadow-sm max-w-xs">
              <img
                src={message.attachment?.url || message.content}
                alt="图片"
                className="max-w-full h-auto"
              />
            </div>
          )}

          {/* 文件 */}
          {message.type === "file" && message.attachment && (
            <div
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg min-w-50
                ${isSelf ? "bg-bg-bubble-self" : "bg-bg-bubble-other shadow-sm"}`}
            >
              <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
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

          {/* 卡片消息（文档分享等） */}
          {message.type === "card" && (() => {
            try {
              const card = JSON.parse(message.content) as { card_type?: string; doc_id?: string; title?: string; doc_type?: string };
              if (card.card_type === "doc") {
                const DocIcon = card.doc_type === "sheet" ? Table2 : FileText;
                return (
                  <Link href={`/docs/${card.doc_id}`} onClick={(e) => e.stopPropagation()}
                    className={`block rounded-xl overflow-hidden border min-w-56 max-w-72 transition-shadow hover:shadow-md
                      ${isSelf ? "border-primary/20" : "border-panel-border shadow-sm"}`}>
                    <div className={`px-3.5 py-3 flex items-center gap-3 ${isSelf ? "bg-primary/5" : "bg-panel-bg"}`}>
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <DocIcon size={20} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{card.title || "未命名文档"}</p>
                        <p className="text-[10px] text-text-placeholder mt-0.5">
                          {card.doc_type === "sheet" ? "电子表格" : "云文档"}
                        </p>
                      </div>
                    </div>
                    <div className={`px-3.5 py-1.5 flex items-center justify-between border-t text-[10px]
                      ${isSelf ? "border-primary/10 bg-primary/2" : "border-panel-border bg-bg-page/50"}`}>
                      <span className="text-text-placeholder">点击查看文档</span>
                      <ExternalLink size={10} className="text-text-placeholder" />
                    </div>
                  </Link>
                );
              }
            } catch { /* 非 JSON 按文本降级 */ }
            return (
              <div className={`px-3 py-2 rounded-lg text-sm ${isSelf ? "bg-bg-bubble-self" : "bg-bg-bubble-other shadow-sm"}`}>
                {message.content}
              </div>
            );
          })()}

          {/* 悬停快捷表情按钮 */}
          {hovered && onReaction && (
            <div
              className={`absolute top-0 ${isSelf ? "-left-7" : "-right-7"} flex items-center`}
              style={{ transform: "translateY(-2px)" }}
            >
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-6 h-6 rounded-full flex items-center justify-center bg-panel-bg border border-panel-border shadow-sm
                  text-text-placeholder hover:text-primary hover:border-primary transition-colors"
                title="表情回复"
              >
                <SmilePlus size={13} />
              </button>
            </div>
          )}
        </div>

        {/* 表情选择器弹出层 */}
        {showEmojiPicker && (
          <div
            className={`mt-1 bg-panel-bg border border-panel-border rounded-xl shadow-lg p-2 z-50
              ${isSelf ? "self-end" : "self-start"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-6 gap-1">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-list-hover
                    transition-colors text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 表情回复标签 */}
        {renderReactions()}

        {/* 时间戳 + 已读状态 */}
        <div className={`flex items-center gap-1.5 mt-0.5 px-1 ${isSelf ? "flex-row-reverse" : ""}`}>
          <span className="text-[10px] text-text-placeholder">
            {formatMessageTime(message.created_at)}
          </span>
          {renderReadStatus()}
        </div>

        {/* 群聊已读用户列表 */}
        {showReaders && isSelf && conversationType === "group" && (
          <div className="mt-1 bg-panel-bg border border-panel-border rounded-lg shadow-lg p-2 min-w-36 max-h-48 overflow-y-auto">
            <p className="text-xs font-medium text-text-secondary mb-1.5">
              已读 ({readers.length})
            </p>
            {loadingReaders ? (
              <p className="text-xs text-text-placeholder py-2 text-center">加载中...</p>
            ) : readers.length > 0 ? (
              <div className="space-y-1">
                {readers.map((r) => (
                  <div key={r.user_id} className="flex items-center gap-2">
                    <Avatar name={r.user?.name || "用户"} avatarUrl={r.user?.avatar_url} size="sm" />
                    <span className="text-xs text-text-primary truncate">{r.user?.name || "用户"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-placeholder py-2 text-center">暂无已读</p>
            )}
          </div>
        )}
      </div>

      {/* 右键菜单 */}
      {showContextMenu && (
        <div
          ref={menuRef}
          style={{ position: "fixed", left: menuPos.x, top: menuPos.y, zIndex: 100 }}
          className="bg-panel-bg border border-panel-border rounded-lg shadow-lg py-1 min-w-25"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleRecall}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors"
          >
            <RotateCcw size={12} /> 撤回
          </button>
        </div>
      )}
    </div>
  );
}
