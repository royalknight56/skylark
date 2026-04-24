/**
 * 日历视图组件
 * 支持月视图和周视图切换
 * @author skylark
 */

"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { CalendarEvent } from "@/lib/types";

type ViewMode = "month" | "week";

interface CalendarViewProps {
  events: CalendarEvent[];
  onSelectDate?: (date: Date) => void;
  onSelectEvent?: (event: CalendarEvent) => void;
  onCreateEvent?: (date?: Date) => void;
}

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const days: { date: Date; isCurrentMonth: boolean }[] = [];
  for (let i = startOffset - 1; i >= 0; i--)
    days.push({ date: new Date(year, month - 1, daysInPrevMonth - i), isCurrentMonth: false });
  for (let i = 1; i <= daysInMonth; i++)
    days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++)
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  return days;
}

/** 获取某周的 7 天 */
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

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatEventTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

export default function CalendarView({ events, onSelectDate, onSelectEvent, onCreateEvent }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthDays = useMemo(() => getMonthDays(year, month), [year, month]);
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter((e) => {
      const s = new Date(e.start_time);
      return s.getFullYear() === date.getFullYear()
        && s.getMonth() === date.getMonth()
        && s.getDate() === date.getDate();
    });
  };

  const goPrev = () => {
    if (viewMode === "month") setCurrentDate(new Date(year, month - 1, 1));
    else { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }
  };
  const goNext = () => {
    if (viewMode === "month") setCurrentDate(new Date(year, month + 1, 1));
    else { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }
  };
  const goToday = () => setCurrentDate(new Date());

  const headerTitle = viewMode === "month"
    ? `${year}年${month + 1}月`
    : `${weekDays[0].getMonth() + 1}月${weekDays[0].getDate()}日 - ${weekDays[6].getMonth() + 1}月${weekDays[6].getDate()}日`;

  return (
    <div className="flex-1 flex flex-col bg-panel-bg overflow-hidden">
      {/* 顶栏 */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-panel-border shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-text-primary">{headerTitle}</h2>
          <div className="flex items-center gap-1">
            <button onClick={goPrev} className="w-7 h-7 rounded flex items-center justify-center text-text-secondary hover:bg-list-hover"><ChevronLeft size={18} /></button>
            <button onClick={goToday} className="px-2.5 h-7 rounded text-xs font-medium text-primary hover:bg-primary-light">今天</button>
            <button onClick={goNext} className="w-7 h-7 rounded flex items-center justify-center text-text-secondary hover:bg-list-hover"><ChevronRight size={18} /></button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 视图切换 */}
          <div className="flex rounded-lg border border-panel-border overflow-hidden">
            <button onClick={() => setViewMode("month")}
              className={`px-3 h-8 text-xs font-medium transition-colors ${viewMode === "month" ? "bg-primary text-white" : "text-text-secondary hover:bg-list-hover"}`}>
              月
            </button>
            <button onClick={() => setViewMode("week")}
              className={`px-3 h-8 text-xs font-medium transition-colors ${viewMode === "week" ? "bg-primary text-white" : "text-text-secondary hover:bg-list-hover"}`}>
              周
            </button>
          </div>
          <button onClick={() => onCreateEvent?.()} className="h-8 px-3 rounded-lg bg-primary text-white text-sm flex items-center gap-1.5 hover:bg-primary-hover">
            <Plus size={16} /> 新建日程
          </button>
        </div>
      </div>

      {viewMode === "month" ? (
        <MonthView days={monthDays} events={events} getEventsForDate={getEventsForDate}
          onSelectDate={onSelectDate} onSelectEvent={onSelectEvent} onCreateEvent={onCreateEvent} />
      ) : (
        <WeekView weekDays={weekDays} events={events} getEventsForDate={getEventsForDate}
          onSelectEvent={onSelectEvent} onCreateEvent={onCreateEvent} />
      )}
    </div>
  );
}

/* ========== 月视图 ========== */
function MonthView({
  days, getEventsForDate, onSelectDate, onSelectEvent, onCreateEvent,
}: {
  days: { date: Date; isCurrentMonth: boolean }[];
  events: CalendarEvent[];
  getEventsForDate: (d: Date) => CalendarEvent[];
  onSelectDate?: (d: Date) => void;
  onSelectEvent?: (e: CalendarEvent) => void;
  onCreateEvent?: (d?: Date) => void;
}) {
  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((day) => (
          <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-text-secondary">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 border-t border-l border-panel-border">
        {days.map(({ date, isCurrentMonth }, index) => {
          const dayEvents = getEventsForDate(date);
          const today = isToday(date);
          return (
            <div key={index}
              onClick={() => { onSelectDate?.(date); onCreateEvent?.(date); }}
              className={`min-h-25 border-r border-b border-panel-border p-1.5 cursor-pointer transition-colors
                ${isCurrentMonth ? "bg-panel-bg" : "bg-bg-page"} hover:bg-list-hover`}>
              <span className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full
                ${today ? "bg-primary text-white font-bold" : ""} ${!isCurrentMonth ? "text-text-placeholder" : "text-text-primary"}`}>
                {date.getDate()}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {dayEvents.slice(0, 3).map((evt) => (
                  <button key={evt.id} onClick={(e) => { e.stopPropagation(); onSelectEvent?.(evt); }}
                    className="w-full text-left text-[11px] px-1.5 py-0.5 rounded truncate"
                    style={{ backgroundColor: evt.color + "20", color: evt.color }}>
                    {formatEventTime(evt.start_time)} {evt.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-text-placeholder px-1.5">+{dayEvents.length - 3} 更多</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ========== 周视图 ========== */
function WeekView({
  weekDays, getEventsForDate, onSelectEvent, onCreateEvent,
}: {
  weekDays: Date[];
  events: CalendarEvent[];
  getEventsForDate: (d: Date) => CalendarEvent[];
  onSelectEvent?: (e: CalendarEvent) => void;
  onCreateEvent?: (d?: Date) => void;
}) {
  return (
    <div className="flex-1 overflow-auto">
      {/* 日期行 */}
      <div className="flex border-b border-panel-border sticky top-0 bg-panel-bg z-10">
        <div className="w-16 shrink-0" />
        {weekDays.map((day, i) => {
          const today = isToday(day);
          return (
            <div key={i} className="flex-1 text-center py-2 border-l border-panel-border">
              <div className="text-xs text-text-secondary">{WEEKDAYS[i]}</div>
              <div className={`text-sm font-semibold mt-0.5 ${today ? "text-primary" : "text-text-primary"}`}>
                {today && <span className="inline-block w-6 h-6 leading-6 rounded-full bg-primary text-white text-xs">{day.getDate()}</span>}
                {!today && day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* 时间网格 */}
      <div className="relative flex">
        {/* 时间列 */}
        <div className="w-16 shrink-0">
          {HOURS.map((h) => (
            <div key={h} className="h-16 flex items-start justify-end pr-2 text-[10px] text-text-placeholder -mt-2 first:mt-0">
              {h.toString().padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* 日程列 */}
        {weekDays.map((day, di) => {
          const dayEvents = getEventsForDate(day);
          return (
            <div key={di} className="flex-1 relative border-l border-panel-border">
              {/* 小时格 */}
              {HOURS.map((h) => (
                <div key={h}
                  onClick={() => {
                    const d = new Date(day);
                    d.setHours(h, 0, 0, 0);
                    onCreateEvent?.(d);
                  }}
                  className="h-16 border-b border-panel-border hover:bg-list-hover/50 cursor-pointer" />
              ))}

              {/* 事件块 */}
              {dayEvents.map((evt) => {
                const startH = new Date(evt.start_time).getHours() + new Date(evt.start_time).getMinutes() / 60;
                const endH = new Date(evt.end_time).getHours() + new Date(evt.end_time).getMinutes() / 60;
                const durationH = Math.max(endH - startH, 0.5);
                return (
                  <button key={evt.id}
                    onClick={(e) => { e.stopPropagation(); onSelectEvent?.(evt); }}
                    className="absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 text-[11px] overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      top: `${startH * 64}px`,
                      height: `${durationH * 64}px`,
                      backgroundColor: evt.color + "30",
                      color: evt.color,
                      borderLeft: `3px solid ${evt.color}`,
                    }}>
                    <div className="font-medium truncate">{evt.title}</div>
                    <div className="text-[10px] opacity-70">{formatEventTime(evt.start_time)} - {formatEventTime(evt.end_time)}</div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
