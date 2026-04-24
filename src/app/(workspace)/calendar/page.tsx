/**
 * 日历页面
 * 支持月/周视图切换、事件详情、创建日程、忙闲查看
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, Eye } from "lucide-react";
import CalendarView from "@/components/calendar/CalendarView";
import EventCard from "@/components/calendar/EventCard";
import CreateEventModal from "@/components/calendar/CreateEventModal";
import BusyFreePanel from "@/components/calendar/BusyFreePanel";
import { useOrg } from "@/lib/org-context";
import type { CalendarEvent } from "@/lib/types";

export default function CalendarPage() {
  const { currentOrg } = useOrg();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createDate, setCreateDate] = useState<Date | undefined>(undefined);
  const [showBusy, setShowBusy] = useState(false);

  /** 加载事件 */
  const loadEvents = useCallback(() => {
    if (!currentOrg) { setLoading(false); return; }
    setLoading(true);
    setSelectedEvent(null);

    fetch(`/api/calendar?org_id=${currentOrg.id}`)
      .then((res) => res.json() as Promise<{ success: boolean; data?: CalendarEvent[] }>)
      .then((json) => {
        if (json.success && json.data) setEvents(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentOrg]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const handleCreateEvent = (date?: Date) => {
    setCreateDate(date);
    setShowCreate(true);
  };

  const handleCreated = () => { loadEvents(); };
  const handleDeleted = () => { loadEvents(); };
  const handleUpdated = () => { loadEvents(); };

  /* 今日日程 */
  const todayEvents = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return events.filter((e) => e.start_time.startsWith(today));
  }, [events]);

  /* 近期日程（未来 7 天） */
  const upcomingEvents = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return events.filter((e) => e.start_time > today).slice(0, 8);
  }, [events]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-page">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex relative">
      {/* 左侧面板 */}
      <div className="w-56 border-r border-panel-border bg-panel-bg flex flex-col shrink-0">
        <div className="h-14 px-4 flex items-center justify-between border-b border-panel-border">
          <h2 className="text-base font-semibold text-text-primary">日历</h2>
          <button onClick={() => setShowBusy(!showBusy)} title="查看忙闲"
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${showBusy ? "bg-primary/10 text-primary" : "text-text-placeholder hover:bg-list-hover"}`}>
            <Eye size={16} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <h3 className="text-xs font-medium text-text-secondary mb-3">今日日程</h3>
          {todayEvents.length === 0 && <p className="text-xs text-text-placeholder mb-4">暂无日程</p>}
          {todayEvents.map((evt) => (
            <button key={evt.id} onClick={() => setSelectedEvent(evt)}
              className="w-full text-left mb-2 p-2 rounded-lg hover:bg-list-hover transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-1 h-8 rounded-full" style={{ backgroundColor: evt.color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary truncate">{evt.title}</p>
                  <p className="text-xs text-text-secondary">
                    {new Date(evt.start_time).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                    {" - "}
                    {new Date(evt.end_time).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {evt.room && (
                    <p className="text-[10px] text-text-placeholder truncate">📍 {evt.room.name}</p>
                  )}
                </div>
              </div>
            </button>
          ))}

          <h3 className="text-xs font-medium text-text-secondary mb-3 mt-6">近期日程</h3>
          {upcomingEvents.length === 0 && <p className="text-xs text-text-placeholder">暂无日程</p>}
          {upcomingEvents.map((evt) => (
            <button key={evt.id} onClick={() => setSelectedEvent(evt)}
              className="w-full text-left mb-2 p-2 rounded-lg hover:bg-list-hover transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-1 h-8 rounded-full" style={{ backgroundColor: evt.color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary truncate">{evt.title}</p>
                  <p className="text-xs text-text-secondary">
                    {new Date(evt.start_time).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
                    {" "}
                    {new Date(evt.start_time).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {evt.room && (
                    <p className="text-[10px] text-text-placeholder truncate">📍 {evt.room.name}</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 日历视图 */}
      <CalendarView
        events={events}
        onSelectEvent={setSelectedEvent}
        onCreateEvent={handleCreateEvent}
      />

      {/* 忙闲面板 */}
      {showBusy && <BusyFreePanel onClose={() => setShowBusy(false)} />}

      {/* 事件详情弹窗 */}
      {selectedEvent && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setSelectedEvent(null)} />
          <EventCard
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onDeleted={handleDeleted}
            onUpdated={handleUpdated}
          />
        </>
      )}

      {/* 创建日程弹窗 */}
      <CreateEventModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
        initialDate={createDate}
      />
    </div>
  );
}
