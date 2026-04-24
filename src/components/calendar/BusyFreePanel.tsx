/**
 * 忙闲查看面板
 * 选择成员查看其一周内的忙闲状态
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { X, Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import type { OrgMember, User } from "@/lib/types";

interface BusyFreePanelProps {
  onClose: () => void;
}

interface BusySlot {
  start_time: string;
  end_time: string;
  title: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getWeekDays(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d);
    dd.setDate(dd.getDate() + i);
    return dd;
  });
}

function isToday(date: Date): boolean {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

const WEEKDAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export default function BusyFreePanel({ onClose }: BusyFreePanelProps) {
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  const [members, setMembers] = useState<(OrgMember & { user: User })[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busyData, setBusyData] = useState<Record<string, BusySlot[]>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [weekDate, setWeekDate] = useState(new Date());

  const weekDays = useMemo(() => getWeekDays(weekDate), [weekDate]);

  /** 加载成员 */
  useEffect(() => {
    if (!currentOrg) return;
    fetch(`/api/orgs/${currentOrg.id}/members`)
      .then((r) => r.json() as Promise<{ success: boolean; data?: (OrgMember & { user: User })[] }>)
      .then((json) => {
        if (json.success && json.data) {
          setMembers(json.data);
          if (user?.id) setSelectedIds(new Set([user.id]));
        }
      })
      .catch(() => {});
  }, [currentOrg, user?.id]);

  /** 查询忙闲 */
  const loadBusy = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setLoading(true);
    try {
      const start = weekDays[0].toISOString();
      const endDate = new Date(weekDays[6]);
      endDate.setHours(23, 59, 59);
      const params = new URLSearchParams({
        user_ids: Array.from(selectedIds).join(","),
        start,
        end: endDate.toISOString(),
      });
      const res = await fetch(`/api/calendar/busy?${params}`);
      const json = (await res.json()) as { success: boolean; data?: Record<string, BusySlot[]> };
      if (json.success && json.data) setBusyData(json.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [selectedIds, weekDays]);

  useEffect(() => { loadBusy(); }, [loadBusy]);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter((m) => m.user.name.toLowerCase().includes(q) || m.user.email.toLowerCase().includes(q));
  }, [members, search]);

  const toggleMember = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  /** 检查某用户在某天某小时是否忙碌 */
  const isBusy = (userId: string, day: Date, hour: number): boolean => {
    const slots = busyData[userId] || [];
    const hStart = new Date(day); hStart.setHours(hour, 0, 0, 0);
    const hEnd = new Date(day); hEnd.setHours(hour + 1, 0, 0, 0);
    return slots.some((s) => {
      const ss = new Date(s.start_time).getTime();
      const se = new Date(s.end_time).getTime();
      return ss < hEnd.getTime() && se > hStart.getTime();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-4xl bg-panel-bg shadow-2xl flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-panel-border shrink-0">
          <h3 className="text-base font-semibold text-text-primary">查看忙闲</h3>
          <button onClick={onClose} className="w-7 h-7 rounded flex items-center justify-center text-text-placeholder hover:bg-list-hover"><X size={16} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 左侧成员选择 */}
          <div className="w-48 border-r border-panel-border overflow-y-auto shrink-0">
            <div className="p-2">
              <div className="relative">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-placeholder" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索成员"
                  className="w-full h-8 pl-7 pr-2 text-xs rounded-lg border border-panel-border bg-bg-page outline-none" />
              </div>
            </div>
            {filteredMembers.map((m) => {
              const checked = selectedIds.has(m.user_id);
              return (
                <button key={m.user_id} onClick={() => toggleMember(m.user_id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-list-hover">
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${checked ? "bg-primary border-primary" : "border-panel-border"}`}>
                    {checked && <span className="text-white text-[8px]">✓</span>}
                  </div>
                  <Avatar name={m.user.name} avatarUrl={m.user.avatar_url} size="sm" />
                  <span className="text-text-primary truncate">{m.user.name}</span>
                </button>
              );
            })}
          </div>

          {/* 右侧忙闲网格 */}
          <div className="flex-1 overflow-auto">
            {/* 导航 */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-panel-border sticky top-0 bg-panel-bg z-10">
              <button onClick={() => { const d = new Date(weekDate); d.setDate(d.getDate() - 7); setWeekDate(d); }}
                className="w-6 h-6 rounded flex items-center justify-center text-text-secondary hover:bg-list-hover"><ChevronLeft size={14} /></button>
              <span className="text-xs text-text-primary font-medium">
                {weekDays[0].toLocaleDateString("zh-CN", { month: "short", day: "numeric" })} - {weekDays[6].toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
              </span>
              <button onClick={() => { const d = new Date(weekDate); d.setDate(d.getDate() + 7); setWeekDate(d); }}
                className="w-6 h-6 rounded flex items-center justify-center text-text-secondary hover:bg-list-hover"><ChevronRight size={14} /></button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><Loader2 size={20} className="text-primary animate-spin" /></div>
            ) : selectedIds.size === 0 ? (
              <div className="flex justify-center py-12 text-sm text-text-placeholder">请选择成员查看忙闲</div>
            ) : (
              <div>
                {/* 日期头 */}
                <div className="flex sticky top-10 bg-panel-bg z-10 border-b border-panel-border">
                  <div className="w-20 shrink-0" />
                  {weekDays.map((day, i) => (
                    <div key={i} className={`flex-1 text-center py-1.5 text-xs border-l border-panel-border ${isToday(day) ? "text-primary font-bold" : "text-text-secondary"}`}>
                      {WEEKDAY_LABELS[i]} {day.getDate()}
                    </div>
                  ))}
                </div>

                {/* 每个选中成员 */}
                {Array.from(selectedIds).map((uid) => {
                  const member = members.find((m) => m.user_id === uid);
                  if (!member) return null;
                  return (
                    <div key={uid} className="border-b border-panel-border">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-list-hover">
                        <Avatar name={member.user.name} avatarUrl={member.user.avatar_url} size="sm" />
                        <span className="text-xs font-medium text-text-primary">{member.user.name}</span>
                      </div>
                      {/* 工作时间段 8-20 简化 */}
                      <div className="flex">
                        <div className="w-20 shrink-0">
                          {HOURS.filter((h) => h >= 8 && h <= 20).map((h) => (
                            <div key={h} className="h-5 flex items-center justify-end pr-2 text-[9px] text-text-placeholder">
                              {h.toString().padStart(2, "0")}:00
                            </div>
                          ))}
                        </div>
                        {weekDays.map((day, di) => (
                          <div key={di} className="flex-1 border-l border-panel-border">
                            {HOURS.filter((h) => h >= 8 && h <= 20).map((h) => {
                              const busy = isBusy(uid, day, h);
                              return (
                                <div key={h}
                                  className={`h-5 border-b border-panel-border ${busy ? "bg-red-100" : "bg-green-50"}`}
                                  title={busy ? `${member.user.name} - ${h}:00 忙碌` : `${member.user.name} - ${h}:00 空闲`} />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
