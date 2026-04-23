/**
 * 日历页面
 * @author skylark
 */

"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import CalendarView from "@/components/calendar/CalendarView";
import EventCard from "@/components/calendar/EventCard";
import { useOrg } from "@/lib/org-context";
import type { CalendarEvent } from "@/lib/types";

export default function CalendarPage() {
  const { currentOrg } = useOrg();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOrg) return;
    setLoading(true);
    setSelectedEvent(null);

    fetch(`/api/calendar?org_id=${currentOrg.id}`)
      .then((res) => res.json() as Promise<{ success: boolean; data?: CalendarEvent[] }>)
      .then((json) => {
        if (json.success && json.data) setEvents(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentOrg?.id, currentOrg]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-page">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex relative">
      {/* 左侧迷你面板 */}
      <div className="w-56 border-r border-panel-border bg-panel-bg flex flex-col shrink-0">
        <div className="h-14 px-4 flex items-center border-b border-panel-border">
          <h2 className="text-base font-semibold text-text-primary">日历</h2>
        </div>

        <div className="p-4">
          <h3 className="text-xs font-medium text-text-secondary mb-3">今日日程</h3>
          {events
            .filter((e) => {
              const today = new Date().toISOString().split("T")[0];
              return e.start_time.startsWith(today);
            })
            .map((evt) => (
              <button
                key={evt.id}
                onClick={() => setSelectedEvent(evt)}
                className="w-full text-left mb-2 p-2 rounded-lg hover:bg-list-hover transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-1 h-8 rounded-full" style={{ backgroundColor: evt.color }} />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{evt.title}</p>
                    <p className="text-xs text-text-secondary">
                      {new Date(evt.start_time).toLocaleTimeString("zh-CN", {
                        hour: "2-digit", minute: "2-digit",
                      })}
                      {" - "}
                      {new Date(evt.end_time).toLocaleTimeString("zh-CN", {
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </button>
            ))}

          <h3 className="text-xs font-medium text-text-secondary mb-3 mt-6">近期日程</h3>
          {events
            .filter((e) => {
              const today = new Date().toISOString().split("T")[0];
              return e.start_time > today;
            })
            .slice(0, 5)
            .map((evt) => (
              <button
                key={evt.id}
                onClick={() => setSelectedEvent(evt)}
                className="w-full text-left mb-2 p-2 rounded-lg hover:bg-list-hover transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-1 h-8 rounded-full" style={{ backgroundColor: evt.color }} />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{evt.title}</p>
                    <p className="text-xs text-text-secondary">
                      {new Date(evt.start_time).toLocaleDateString("zh-CN", {
                        month: "short", day: "numeric",
                      })}
                      {" "}
                      {new Date(evt.start_time).toLocaleTimeString("zh-CN", {
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </button>
            ))}
        </div>
      </div>

      {/* 月视图 */}
      <CalendarView events={events} onSelectEvent={setSelectedEvent} />

      {/* 事件详情弹窗 */}
      {selectedEvent && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setSelectedEvent(null)}
          />
          <EventCard event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        </>
      )}
    </div>
  );
}
