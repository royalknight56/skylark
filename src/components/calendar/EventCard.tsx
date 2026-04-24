/**
 * 日历事件详情卡片
 * 支持查看参与者、回复邀请、编辑、删除、分享、签到
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Clock, MapPin, X, DoorOpen, UserCheck, Users,
  Check, XCircle, HelpCircle, Pencil, Trash2,
  Share2, Copy, LogIn, Repeat, Bell, Loader2,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useAuth } from "@/lib/auth-context";
import type { CalendarEvent, CalendarAttendee, User } from "@/lib/types";

interface EventCardProps {
  event: CalendarEvent;
  onClose: () => void;
  onDeleted?: () => void;
  onUpdated?: () => void;
}

function formatEventDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("zh-CN", {
    month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const RECURRENCE_LABELS: Record<string, string> = {
  daily: "每天", weekly: "每周", biweekly: "每两周",
  monthly: "每月", yearly: "每年", weekdays: "工作日",
};

const STATUS_CONFIG = {
  accepted: { icon: Check, label: "已接受", color: "text-green-600 bg-green-50" },
  declined: { icon: XCircle, label: "已拒绝", color: "text-red-500 bg-red-50" },
  tentative: { icon: HelpCircle, label: "暂定", color: "text-yellow-600 bg-yellow-50" },
  pending: { icon: Clock, label: "待回复", color: "text-text-placeholder bg-list-hover" },
};

export default function EventCard({ event, onClose, onDeleted, onUpdated }: EventCardProps) {
  const { user } = useAuth();
  const [detail, setDetail] = useState<CalendarEvent>(event);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"info" | "attendees">("info");

  const isCreator = user?.id === detail.creator_id;

  /** 加载完整事件详情 */
  useEffect(() => {
    setLoading(true);
    fetch(`/api/calendar/${event.id}`)
      .then((r) => r.json())
      .then((json: unknown) => {
        const result = json as { success: boolean; data?: CalendarEvent };
        if (result.success && result.data) setDetail(result.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [event.id]);

  /** 当前用户的参与状态 */
  const myAttendee = detail.attendees?.find((a) => a.user_id === user?.id);

  /** 回复邀请 */
  const handleRespond = useCallback(async (status: string) => {
    setActing(true);
    try {
      await fetch(`/api/calendar/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "respond", status }),
      });
      setDetail((prev) => ({
        ...prev,
        attendees: prev.attendees?.map((a) =>
          a.user_id === user?.id ? { ...a, status: status as CalendarAttendee["status"] } : a
        ),
      }));
      onUpdated?.();
    } finally { setActing(false); }
  }, [event.id, user?.id, onUpdated]);

  /** 签到 */
  const handleCheckIn = useCallback(async () => {
    setActing(true);
    try {
      await fetch(`/api/calendar/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_in" }),
      });
      setDetail((prev) => ({
        ...prev,
        attendees: prev.attendees?.map((a) =>
          a.user_id === user?.id ? { ...a, checked_in: true, checked_in_at: new Date().toISOString() } : a
        ),
      }));
    } finally { setActing(false); }
  }, [event.id, user?.id]);

  /** 删除日程 */
  const handleDelete = useCallback(async () => {
    if (!confirm("确定要删除此日程吗？")) return;
    setActing(true);
    try {
      const res = await fetch(`/api/calendar/${event.id}`, { method: "DELETE" });
      const json = (await res.json()) as { success: boolean };
      if (json.success) { onDeleted?.(); onClose(); }
    } finally { setActing(false); }
  }, [event.id, onClose, onDeleted]);

  /** 分享链接 */
  const handleShare = () => {
    const url = `${window.location.origin}/calendar?event=${event.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /** 退出日程 */
  const handleLeave = useCallback(async () => {
    if (!confirm("确定要退出此日程吗？")) return;
    setActing(true);
    try {
      await fetch(`/api/calendar/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave" }),
      });
      onDeleted?.();
      onClose();
    } finally { setActing(false); }
  }, [event.id, onClose, onDeleted]);

  const acceptedCount = detail.attendees?.filter((a) => a.status === "accepted").length || 0;
  const totalCount = detail.attendees?.length || 0;

  // 判断是否在日程进行时间内（可签到）
  const now = Date.now();
  const eventStart = new Date(detail.start_time).getTime();
  const eventEnd = new Date(detail.end_time).getTime();
  const canCheckIn = now >= eventStart - 15 * 60000 && now <= eventEnd && myAttendee && !myAttendee.checked_in;

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 bg-panel-bg rounded-xl shadow-2xl z-50 overflow-hidden max-h-[80vh] flex flex-col">
      {/* 顶部色条 */}
      <div className="h-2 shrink-0" style={{ backgroundColor: detail.color }} />

      {/* 标题栏 */}
      <div className="px-5 pt-4 pb-2 shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-text-primary pr-8">{detail.title}</h3>
            {detail.recurrence_rule && (
              <span className="inline-flex items-center gap-1 text-xs text-primary mt-1">
                <Repeat size={11} /> {RECURRENCE_LABELS[detail.recurrence_rule] || detail.recurrence_rule}
              </span>
            )}
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded flex items-center justify-center text-text-placeholder hover:bg-list-hover shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-4 mt-3 border-b border-panel-border">
          <button onClick={() => setTab("info")}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${tab === "info" ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}>
            详情
          </button>
          <button onClick={() => setTab("attendees")}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${tab === "attendees" ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}>
            参与者 ({totalCount})
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 min-h-0">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="text-primary animate-spin" /></div>
        ) : tab === "info" ? (
          <div className="space-y-3 mt-3">
            {/* 时间 */}
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Clock size={14} className="shrink-0" />
              <span>{formatEventDateTime(detail.start_time)} - {formatEventDateTime(detail.end_time)}</span>
            </div>

            {/* 提醒 */}
            {detail.reminder_minutes > 0 && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Bell size={14} className="shrink-0" />
                <span>提前 {detail.reminder_minutes} 分钟提醒</span>
              </div>
            )}

            {/* 会议室 */}
            {detail.room && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <DoorOpen size={14} className="text-primary shrink-0" />
                <span>{detail.room.name}（{detail.room.building} {detail.room.floor || ""} {detail.room.room_number}）</span>
              </div>
            )}

            {/* 地点 */}
            {detail.location && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <MapPin size={14} className="shrink-0" />
                <span>{detail.location}</span>
              </div>
            )}

            {/* 参与者摘要 */}
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Users size={14} className="shrink-0" />
              <span>{acceptedCount}/{totalCount} 人已接受</span>
            </div>

            {/* 组织者 */}
            {detail.creator && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <UserCheck size={14} className="shrink-0" />
                <span>组织者：{detail.creator.name}</span>
              </div>
            )}

            {/* 描述 */}
            {detail.description && (
              <div className="mt-2 p-3 bg-list-hover rounded-lg text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                {detail.description}
              </div>
            )}

            {/* 我的回复状态 + 操作 */}
            {myAttendee && (
              <div className="mt-3 p-3 bg-bg-page rounded-lg">
                <p className="text-xs text-text-placeholder mb-2">我的回复</p>
                <div className="flex gap-2">
                  {(["accepted", "tentative", "declined"] as const).map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    const Icon = cfg.icon;
                    const active = myAttendee.status === s;
                    return (
                      <button key={s} onClick={() => handleRespond(s)} disabled={acting}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-colors border
                          ${active ? cfg.color + " border-current" : "border-panel-border text-text-secondary hover:bg-list-hover"}`}>
                        <Icon size={12} /> {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 签到 */}
            {canCheckIn && (
              <button onClick={handleCheckIn} disabled={acting}
                className="w-full py-2.5 rounded-lg bg-green-500 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-green-600 transition-colors">
                <LogIn size={16} /> 立即签到
              </button>
            )}
            {myAttendee?.checked_in && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Check size={14} /> 已签到
                {myAttendee.checked_in_at && (
                  <span className="text-xs text-text-placeholder">
                    {new Date(myAttendee.checked_in_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          /* 参与者列表 */
          <div className="mt-3 space-y-1">
            {detail.attendees?.map((att) => {
              const cfg = STATUS_CONFIG[att.status] || STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              return (
                <div key={att.user_id} className="flex items-center gap-3 py-2">
                  <Avatar name={att.user?.name || "?"} avatarUrl={att.user?.avatar_url} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-text-primary truncate">{att.user?.name}</span>
                      {att.user_id === detail.creator_id && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">组织者</span>
                      )}
                      {att.is_optional && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-text-placeholder">可选</span>
                      )}
                    </div>
                    <p className="text-xs text-text-placeholder">{att.user?.email}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${cfg.color}`}>
                    <Icon size={11} /> {cfg.label}
                  </span>
                  {att.checked_in && <Check size={14} className="text-green-500 shrink-0" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 底部操作 */}
      <div className="px-5 py-3 border-t border-panel-border flex gap-2 shrink-0">
        <button onClick={handleShare}
          className="flex items-center gap-1 px-3 py-2 text-xs text-text-secondary hover:bg-list-hover rounded-lg transition-colors">
          {copied ? <><Check size={12} /> 已复制</> : <><Share2 size={12} /> 分享</>}
        </button>
        {isCreator ? (
          <>
            <div className="flex-1" />
            <button onClick={handleDelete} disabled={acting}
              className="flex items-center gap-1 px-3 py-2 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 size={12} /> 删除
            </button>
          </>
        ) : (
          <>
            <div className="flex-1" />
            <button onClick={handleLeave} disabled={acting}
              className="flex items-center gap-1 px-3 py-2 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <X size={12} /> 退出日程
            </button>
          </>
        )}
      </div>
    </div>
  );
}
