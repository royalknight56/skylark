/**
 * 日历月视图组件
 * 支持月份切换、事件展示
 * @author skylark
 */

"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { CalendarEvent } from "@/lib/types";

interface CalendarViewProps {
  events: CalendarEvent[];
  onSelectDate?: (date: Date) => void;
  onSelectEvent?: (event: CalendarEvent) => void;
}

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

/** 生成月份日历格子 */
function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  // 使周一为起始（0=周一, 6=周日）
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: { date: Date; isCurrentMonth: boolean }[] = [];

  // 上月末尾
  for (let i = startOffset - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, daysInPrevMonth - i),
      isCurrentMonth: false,
    });
  }

  // 当月
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }

  // 下月开头，补满 6 行
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    });
  }

  return days;
}

/** 判断日期是否为今天 */
function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/** 格式化事件时间 */
function formatEventTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CalendarView({ events, onSelectDate, onSelectEvent }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const days = useMemo(() => getMonthDays(year, month), [year, month]);

  /** 获取某天的事件列表 */
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = date.toISOString().split("T")[0];
    return events.filter((e) => {
      const eventDate = e.start_time.split("T")[0];
      return eventDate === dateStr;
    });
  };

  /** 月份导航 */
  const goToPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  return (
    <div className="flex-1 flex flex-col bg-panel-bg overflow-hidden">
      {/* 顶栏 */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-panel-border flex-shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-text-primary">
            {year}年{month + 1}月
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={goToPrevMonth}
              className="w-7 h-7 rounded flex items-center justify-center text-text-secondary hover:bg-list-hover transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={goToToday}
              className="px-2.5 h-7 rounded text-xs font-medium text-primary hover:bg-primary-light transition-colors"
            >
              今天
            </button>
            <button
              onClick={goToNextMonth}
              className="w-7 h-7 rounded flex items-center justify-center text-text-secondary hover:bg-list-hover transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <button className="h-8 px-3 rounded-lg bg-primary text-white text-sm flex items-center gap-1.5 hover:bg-primary-hover transition-colors">
          <Plus size={16} />
          新建日程
        </button>
      </div>

      {/* 日历网格 */}
      <div className="flex-1 overflow-auto p-4">
        {/* 星期标题 */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="h-8 flex items-center justify-center text-xs font-medium text-text-secondary"
            >
              {day}
            </div>
          ))}
        </div>

        {/* 日期格子 */}
        <div className="grid grid-cols-7 border-t border-l border-panel-border">
          {days.map(({ date, isCurrentMonth }, index) => {
            const dayEvents = getEventsForDate(date);
            const today = isToday(date);

            return (
              <div
                key={index}
                onClick={() => onSelectDate?.(date)}
                className={`min-h-[100px] border-r border-b border-panel-border p-1.5 cursor-pointer transition-colors
                  ${isCurrentMonth ? "bg-panel-bg" : "bg-bg-page"}
                  hover:bg-list-hover`}
              >
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full
                    ${today ? "bg-primary text-white font-bold" : ""}
                    ${!isCurrentMonth ? "text-text-placeholder" : "text-text-primary"}`}
                >
                  {date.getDate()}
                </span>

                {/* 事件标签 */}
                <div className="mt-0.5 space-y-0.5">
                  {dayEvents.slice(0, 3).map((evt) => (
                    <button
                      key={evt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent?.(evt);
                      }}
                      className="w-full text-left text-[11px] px-1.5 py-0.5 rounded truncate"
                      style={{
                        backgroundColor: evt.color + "20",
                        color: evt.color,
                      }}
                    >
                      {formatEventTime(evt.start_time)} {evt.title}
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[10px] text-text-placeholder px-1.5">
                      +{dayEvents.length - 3} 更多
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
