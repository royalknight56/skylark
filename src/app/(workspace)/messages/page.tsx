/**
 * 消息列表页 - 默认空状态（未选中具体会话）
 * @author skylark
 */

"use client";

import { MessageSquare } from "lucide-react";

export default function MessagesPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg-page">
      <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center mb-4">
        <MessageSquare size={32} className="text-primary" />
      </div>
      <p className="text-text-secondary text-sm">选择一个会话开始聊天</p>
    </div>
  );
}
