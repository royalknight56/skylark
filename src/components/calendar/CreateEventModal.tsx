/**
 * 创建日程弹窗
 * 支持标题、时间、参与人选择、会议室预订
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  X, Loader2, Calendar, Clock, MapPin,
  Users, AlertCircle, Check, DoorOpen,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import type { MeetingRoom, CalendarEvent, OrgMember, User } from "@/lib/types";

/** 会议室（含当前时段预订信息） */
interface RoomWithBookings extends MeetingRoom {
  bookings?: CalendarEvent[];
}

interface CreateEventModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (event: CalendarEvent) => void;
  /** 预设日期 */
  initialDate?: Date;
}

/** 颜色预设 */
const COLOR_OPTIONS = [
  "#3370FF", "#F54A45", "#FF7D00", "#FAAD14",
  "#00B365", "#7B61FF", "#E91E8C", "#0FC6C2",
];

/** 格式化日期为 input[type=datetime-local] 的值 */
function toLocalDatetime(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CreateEventModal({
  open, onClose, onCreated, initialDate,
}: CreateEventModalProps) {
  const { currentOrg } = useOrg();
  const { user } = useAuth();

  // 表单状态
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [color, setColor] = useState("#3370FF");
  const [allDay, setAllDay] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 会议室数据
  const [rooms, setRooms] = useState<RoomWithBookings[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [showRoomPicker, setShowRoomPicker] = useState(false);

  // 成员数据
  const [members, setMembers] = useState<(OrgMember & { user: User })[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  /** 初始化默认时间 */
  useEffect(() => {
    if (open) {
      const base = initialDate || new Date();
      const start = new Date(base);
      start.setMinutes(0, 0, 0);
      if (!initialDate) start.setHours(start.getHours() + 1);
      const end = new Date(start);
      end.setHours(end.getHours() + 1);

      setStartTime(toLocalDatetime(start));
      setEndTime(toLocalDatetime(end));
      setTitle("");
      setDescription("");
      setColor("#3370FF");
      setAllDay(false);
      setSelectedRoom(null);
      setSelectedMembers(new Set());
      setError("");
    }
  }, [open, initialDate]);

  /** 加载企业成员 */
  useEffect(() => {
    if (!open || !currentOrg) return;
    fetch(`/api/orgs/${currentOrg.id}/members`)
      .then((r) => r.json() as Promise<{ success: boolean; data?: (OrgMember & { user: User })[] }>)
      .then((json) => { if (json.success && json.data) setMembers(json.data.filter((m) => m.user_id !== user?.id)); })
      .catch(() => {});
  }, [open, currentOrg, user?.id]);

  /** 加载会议室（含当前时段占用状态） */
  const loadRooms = useCallback(async () => {
    if (!currentOrg || !startTime || !endTime) return;
    setLoadingRooms(true);
    try {
      const params = new URLSearchParams({
        org_id: currentOrg.id,
        start: new Date(startTime).toISOString(),
        end: new Date(endTime).toISOString(),
      });
      const res = await fetch(`/api/rooms?${params}`);
      const json = (await res.json()) as { success: boolean; data?: RoomWithBookings[] };
      if (json.success && json.data) setRooms(json.data);
    } catch { /* ignore */ }
    finally { setLoadingRooms(false); }
  }, [currentOrg, startTime, endTime]);

  useEffect(() => {
    if (showRoomPicker) loadRooms();
  }, [showRoomPicker, loadRooms]);

  /** 选中的会议室信息 */
  const selectedRoomInfo = useMemo(
    () => rooms.find((r) => r.id === selectedRoom),
    [rooms, selectedRoom]
  );

  /** 检查会议室在当前时段是否被占用 */
  const isRoomBusy = (room: RoomWithBookings): boolean => {
    if (!room.bookings || room.bookings.length === 0) return false;
    const s = new Date(startTime).getTime();
    const e = new Date(endTime).getTime();
    return room.bookings.some((b) => {
      const bs = new Date(b.start_time).getTime();
      const be = new Date(b.end_time).getTime();
      return bs < e && be > s;
    });
  };

  /** 过滤成员 */
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const q = memberSearch.toLowerCase();
    return members.filter((m) =>
      m.user.name.toLowerCase().includes(q) || m.user.email.toLowerCase().includes(q)
    );
  }, [members, memberSearch]);

  /** 切换成员选择 */
  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  /** 提交创建 */
  const handleSubmit = async () => {
    if (!currentOrg || !title.trim() || !startTime || !endTime) return;
    setError("");
    setSubmitting(true);

    try {
      const attendeeIds = [user!.id, ...Array.from(selectedMembers)];
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: currentOrg.id,
          title: title.trim(),
          description: description.trim() || undefined,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          all_day: allDay,
          color,
          attendee_ids: attendeeIds,
          room_id: selectedRoom || undefined,
        }),
      });

      const json = (await res.json()) as { success: boolean; data?: CalendarEvent; error?: string };
      if (!res.ok || !json.success) {
        setError(json.error || "创建失败");
        return;
      }

      if (json.data) {
        onCreated(json.data);
        onClose();
      }
    } catch {
      setError("网络错误");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-panel-bg rounded-2xl shadow-2xl border border-panel-border z-50 overflow-hidden flex flex-col max-h-[85vh]">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-panel-border shrink-0">
          <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Calendar size={18} className="text-primary" />
            新建日程
          </h3>
          <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-text-placeholder hover:bg-list-hover">
            <X size={16} />
          </button>
        </div>

        {/* 表单 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          {/* 错误提示 */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* 标题 */}
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="日程标题"
            className="w-full h-10 px-3 rounded-lg border border-panel-border text-sm bg-bg-page
              text-text-primary placeholder:text-text-placeholder outline-none focus:ring-2 focus:ring-primary/30" />

          {/* 时间 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-xs text-text-secondary mb-1">
                <Clock size={11} /> 开始时间
              </label>
              <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="w-full h-9 px-2 rounded-lg border border-panel-border text-xs bg-bg-page outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs text-text-secondary mb-1">
                <Clock size={11} /> 结束时间
              </label>
              <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="w-full h-9 px-2 rounded-lg border border-panel-border text-xs bg-bg-page outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          {/* 描述 */}
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="添加描述（可选）" rows={2}
            className="w-full px-3 py-2 rounded-lg border border-panel-border text-sm bg-bg-page
              text-text-primary placeholder:text-text-placeholder outline-none focus:ring-2 focus:ring-primary/30 resize-none" />

          {/* 颜色选择 */}
          <div>
            <label className="text-xs text-text-secondary mb-1.5 block">颜色</label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-110"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          {/* 会议室选择 */}
          <div>
            <label className="flex items-center gap-1 text-xs text-text-secondary mb-1.5">
              <DoorOpen size={11} /> 预订会议室（可选）
            </label>
            {selectedRoom && selectedRoomInfo ? (
              <div className="flex items-center justify-between p-2.5 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2">
                  <DoorOpen size={14} className="text-primary" />
                  <div>
                    <p className="text-xs font-medium text-text-primary">{selectedRoomInfo.name}</p>
                    <p className="text-[10px] text-text-secondary">
                      {selectedRoomInfo.building} {selectedRoomInfo.floor ? `${selectedRoomInfo.floor} ` : ""}{selectedRoomInfo.room_number} · {selectedRoomInfo.capacity}人
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedRoom(null)} className="text-text-placeholder hover:text-red-500">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowRoomPicker(true)}
                className="w-full h-9 px-3 rounded-lg border border-dashed border-panel-border text-xs text-text-placeholder
                  hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1">
                <MapPin size={12} /> 选择会议室
              </button>
            )}
          </div>

          {/* 参与人 */}
          <div>
            <label className="flex items-center gap-1 text-xs text-text-secondary mb-1.5">
              <Users size={11} /> 参与人
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {/* 自己（默认） */}
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs">
                {user?.name}（我）
              </span>
              {Array.from(selectedMembers).map((uid) => {
                const m = members.find((mm) => mm.user_id === uid);
                return m ? (
                  <span key={uid} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs">
                    {m.user.name}
                    <button onClick={() => toggleMember(uid)} className="hover:text-red-500"><X size={10} /></button>
                  </span>
                ) : null;
              })}
            </div>
            <button onClick={() => setShowMemberPicker(!showMemberPicker)}
              className="text-xs text-primary hover:underline">
              + 添加参与人
            </button>

            {showMemberPicker && (
              <div className="mt-2 border border-panel-border rounded-lg bg-bg-page max-h-40 overflow-y-auto">
                <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="搜索成员…"
                  className="w-full h-8 px-3 text-xs border-b border-panel-border bg-transparent outline-none" />
                {filteredMembers.map((m) => {
                  const checked = selectedMembers.has(m.user_id);
                  return (
                    <button key={m.user_id} onClick={() => toggleMember(m.user_id)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-list-hover">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${checked ? "bg-primary border-primary" : "border-panel-border"}`}>
                        {checked && <Check size={10} className="text-white" />}
                      </div>
                      <Avatar name={m.user.name} avatarUrl={m.user.avatar_url} size="sm" />
                      <span className="text-text-primary">{m.user.name}</span>
                      <span className="text-text-placeholder ml-auto">{m.user.email}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 底部 */}
        <div className="px-5 py-3 border-t border-panel-border flex justify-end gap-2 shrink-0">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:bg-list-hover rounded-lg transition-colors">
            取消
          </button>
          <button onClick={handleSubmit} disabled={submitting || !title.trim()}
            className="flex items-center gap-1.5 px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium
              hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {submitting && <Loader2 size={14} className="animate-spin" />}
            创建日程
          </button>
        </div>

        {/* 会议室选择弹窗 */}
        {showRoomPicker && (
          <RoomPickerPanel
            rooms={rooms}
            loading={loadingRooms}
            selectedId={selectedRoom}
            isRoomBusy={isRoomBusy}
            onSelect={(id) => { setSelectedRoom(id); setShowRoomPicker(false); }}
            onClose={() => setShowRoomPicker(false)}
          />
        )}
      </div>
    </>
  );
}

/* ========== 会议室选择面板 ========== */
function RoomPickerPanel({
  rooms, loading, selectedId, isRoomBusy, onSelect, onClose,
}: {
  rooms: RoomWithBookings[];
  loading: boolean;
  selectedId: string | null;
  isRoomBusy: (r: RoomWithBookings) => boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <div className="absolute left-5 right-5 bottom-16 bg-panel-bg rounded-xl shadow-lg border border-panel-border z-60 max-h-64 overflow-y-auto">
        <div className="sticky top-0 bg-panel-bg px-3 py-2 border-b border-panel-border">
          <p className="text-xs font-medium text-text-primary">选择会议室</p>
          <p className="text-[10px] text-text-placeholder">灰色为该时段已被占用</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={18} className="text-primary animate-spin" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="py-8 text-center text-xs text-text-placeholder">暂无可用会议室</div>
        ) : (
          rooms.map((room) => {
            const busy = isRoomBusy(room);
            const isSelected = selectedId === room.id;
            return (
              <button
                key={room.id}
                onClick={() => !busy && onSelect(room.id)}
                disabled={busy}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
                  ${busy ? "opacity-40 cursor-not-allowed" : "hover:bg-list-hover cursor-pointer"}
                  ${isSelected ? "bg-primary/5" : ""}`}
              >
                <DoorOpen size={16} className={busy ? "text-text-placeholder" : "text-primary"} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-text-primary">{room.name}</span>
                    {busy && <span className="text-[10px] text-red-500">已占用</span>}
                  </div>
                  <p className="text-[10px] text-text-secondary">
                    {room.building} {room.floor ? `${room.floor} ` : ""}{room.room_number} · {room.capacity}人
                    {room.facilities && room.facilities.length > 0 && ` · ${room.facilities.join("、")}`}
                  </p>
                </div>
                {isSelected && <Check size={14} className="text-primary shrink-0" />}
              </button>
            );
          })
        )}
      </div>
    </>
  );
}
