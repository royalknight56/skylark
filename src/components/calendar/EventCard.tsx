/**
 * 日历事件详情卡片
 * @author skylark
 */

"use client";

import { Clock, MapPin, Users, X, DoorOpen } from "lucide-react";
import type { CalendarEvent } from "@/lib/types";

interface EventCardProps {
  event: CalendarEvent;
  onClose: () => void;
}

function formatEventDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EventCard({ event, onClose }: EventCardProps) {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-panel-bg rounded-xl shadow-lg z-50 overflow-hidden">
      {/* 顶部色条 */}
      <div className="h-2" style={{ backgroundColor: event.color }} />

      <div className="p-5">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-6 h-6 rounded flex items-center justify-center text-text-secondary hover:bg-list-hover transition-colors"
        >
          <X size={16} />
        </button>

        {/* 标题 */}
        <h3 className="text-base font-semibold text-text-primary pr-6">{event.title}</h3>

        {/* 时间 */}
        <div className="flex items-center gap-2 mt-3 text-sm text-text-secondary">
          <Clock size={14} />
          <span>
            {formatEventDateTime(event.start_time)} - {formatEventDateTime(event.end_time)}
          </span>
        </div>

        {/* 会议室 */}
        {event.room && (
          <div className="flex items-center gap-2 mt-3 text-sm text-text-secondary">
            <DoorOpen size={14} className="text-primary shrink-0" />
            <span>
              {event.room.name}（{event.room.building} {event.room.floor ? `${event.room.floor} ` : ""}{event.room.room_number}）
            </span>
          </div>
        )}

        {/* 描述 */}
        {event.description && (
          <p className="mt-3 text-sm text-text-secondary leading-relaxed">
            {event.description}
          </p>
        )}

        {/* 操作按钮 */}
        <div className="mt-4 flex gap-2">
          <button className="flex-1 h-8 rounded-lg bg-primary text-white text-sm hover:bg-primary-hover transition-colors">
            编辑
          </button>
          <button className="flex-1 h-8 rounded-lg border border-panel-border text-sm text-text-secondary hover:bg-list-hover transition-colors">
            删除
          </button>
        </div>
      </div>
    </div>
  );
}
