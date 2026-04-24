/**
 * 管理后台 - 会议室管理页面
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Loader2, Pencil, Trash2, DoorOpen,
  Building2, Users, Monitor, X, Check,
} from "lucide-react";
import { useOrg } from "@/lib/org-context";
import type { MeetingRoom, RoomStatus } from "@/lib/types";

/** 可选设备列表 */
const FACILITY_OPTIONS = ["投影仪", "白板", "视频会议", "电话会议", "显示屏", "空调", "打印机"];

/** 状态标签配置 */
const STATUS_CONFIG: Record<RoomStatus, { label: string; class: string }> = {
  available: { label: "可用", class: "bg-green-100 text-green-700" },
  maintenance: { label: "维护中", class: "bg-yellow-100 text-yellow-700" },
  disabled: { label: "已停用", class: "bg-red-100 text-red-700" },
};

export default function AdminRoomsPage() {
  const { currentOrg } = useOrg();
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<MeetingRoom | null>(null);

  // 表单状态
  const [formName, setFormName] = useState("");
  const [formBuilding, setFormBuilding] = useState("");
  const [formFloor, setFormFloor] = useState("");
  const [formRoomNumber, setFormRoomNumber] = useState("");
  const [formCapacity, setFormCapacity] = useState(10);
  const [formFacilities, setFormFacilities] = useState<string[]>([]);
  const [formStatus, setFormStatus] = useState<RoomStatus>("available");
  const [submitting, setSubmitting] = useState(false);

  /** 加载会议室列表 */
  const loadRooms = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/rooms?org_id=${currentOrg.id}`);
      const json = (await res.json()) as { success: boolean; data?: MeetingRoom[] };
      if (json.success && json.data) setRooms(json.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [currentOrg]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  /** 重置表单 */
  const resetForm = () => {
    setFormName(""); setFormBuilding(""); setFormFloor(""); setFormRoomNumber("");
    setFormCapacity(10); setFormFacilities([]); setFormStatus("available");
    setEditingRoom(null); setShowForm(false);
  };

  /** 打开编辑 */
  const openEdit = (room: MeetingRoom) => {
    setEditingRoom(room);
    setFormName(room.name);
    setFormBuilding(room.building);
    setFormFloor(room.floor || "");
    setFormRoomNumber(room.room_number);
    setFormCapacity(room.capacity);
    setFormFacilities(room.facilities || []);
    setFormStatus(room.status);
    setShowForm(true);
  };

  /** 提交创建/更新 */
  const handleSubmit = async () => {
    if (!currentOrg || !formName.trim() || !formBuilding.trim() || !formRoomNumber.trim()) return;
    setSubmitting(true);
    try {
      if (editingRoom) {
        await fetch("/api/admin/rooms", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            org_id: currentOrg.id, room_id: editingRoom.id,
            name: formName.trim(), building: formBuilding.trim(),
            floor: formFloor.trim() || undefined, room_number: formRoomNumber.trim(),
            capacity: formCapacity, facilities: formFacilities, status: formStatus,
          }),
        });
      } else {
        await fetch("/api/admin/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            org_id: currentOrg.id,
            name: formName.trim(), building: formBuilding.trim(),
            floor: formFloor.trim() || undefined, room_number: formRoomNumber.trim(),
            capacity: formCapacity, facilities: formFacilities,
          }),
        });
      }
      resetForm();
      await loadRooms();
    } catch { /* ignore */ }
    finally { setSubmitting(false); }
  };

  /** 删除会议室 */
  const handleDelete = async (room: MeetingRoom) => {
    if (!currentOrg || !confirm(`确定删除会议室「${room.name}」？已有的预订将自动解除会议室关联。`)) return;
    try {
      await fetch(`/api/admin/rooms?org_id=${currentOrg.id}&room_id=${room.id}`, { method: "DELETE" });
      await loadRooms();
    } catch { /* ignore */ }
  };

  /** 切换设备选择 */
  const toggleFacility = (f: string) => {
    setFormFacilities((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  };

  /** 按楼栋分组 */
  const groupedRooms = rooms.reduce<Record<string, MeetingRoom[]>>((acc, room) => {
    const key = room.building;
    if (!acc[key]) acc[key] = [];
    acc[key].push(room);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* 页头 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <DoorOpen size={22} className="text-primary" />
            会议室管理
          </h1>
          <p className="text-sm text-text-secondary mt-1">管理企业会议室，员工可在创建日程时预订</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium
            hover:bg-primary/90 transition-colors">
          <Plus size={16} /> 添加会议室
        </button>
      </div>

      {/* 会议室列表 */}
      {rooms.length === 0 ? (
        <div className="bg-panel-bg rounded-xl border border-panel-border p-12 text-center">
          <DoorOpen size={40} className="mx-auto mb-3 text-text-placeholder opacity-40" />
          <p className="text-sm text-text-secondary">暂无会议室</p>
          <p className="text-xs text-text-placeholder mt-1">点击上方按钮添加企业会议室</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedRooms).map(([building, buildingRooms]) => (
            <div key={building}>
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-3">
                <Building2 size={15} className="text-text-secondary" />
                {building}
                <span className="text-xs text-text-placeholder font-normal">({buildingRooms.length} 间)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {buildingRooms.map((room) => {
                  const statusCfg = STATUS_CONFIG[room.status];
                  return (
                    <div key={room.id}
                      className="bg-panel-bg rounded-xl border border-panel-border p-4 hover:shadow-md transition-shadow group">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-sm font-semibold text-text-primary">{room.name}</h4>
                          <p className="text-xs text-text-secondary">
                            {room.building} {room.floor ? `${room.floor} ` : ""}{room.room_number}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCfg.class}`}>
                          {statusCfg.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-text-secondary mb-3">
                        <span className="flex items-center gap-1">
                          <Users size={12} /> {room.capacity} 人
                        </span>
                        {room.facilities && room.facilities.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Monitor size={12} /> {room.facilities.length} 项设备
                          </span>
                        )}
                      </div>

                      {/* 设备标签 */}
                      {room.facilities && room.facilities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {room.facilities.map((f) => (
                            <span key={f} className="px-1.5 py-0.5 bg-bg-page rounded text-[10px] text-text-secondary">
                              {f}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* 操作 */}
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(room)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs text-primary hover:bg-primary/10 rounded-md transition-colors">
                          <Pencil size={11} /> 编辑
                        </button>
                        <button onClick={() => handleDelete(room)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 rounded-md transition-colors">
                          <Trash2 size={11} /> 删除
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 创建/编辑弹窗 */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={resetForm} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-panel-bg rounded-2xl shadow-2xl border border-panel-border z-50 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-panel-border">
              <h3 className="text-base font-semibold text-text-primary">
                {editingRoom ? "编辑会议室" : "添加会议室"}
              </h3>
              <button onClick={resetForm} className="w-7 h-7 rounded-md flex items-center justify-center text-text-placeholder hover:bg-list-hover">
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* 名称 */}
              <div>
                <label className="block text-xs text-text-secondary mb-1">会议室名称 *</label>
                <input value={formName} onChange={(e) => setFormName(e.target.value)}
                  placeholder="如：大会议室A" className="w-full h-9 px-3 rounded-lg border border-panel-border text-sm bg-bg-page outline-none focus:ring-2 focus:ring-primary/30" />
              </div>

              {/* 楼栋 + 楼层 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">楼栋 *</label>
                  <input value={formBuilding} onChange={(e) => setFormBuilding(e.target.value)}
                    placeholder="如：A栋" className="w-full h-9 px-3 rounded-lg border border-panel-border text-sm bg-bg-page outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">楼层</label>
                  <input value={formFloor} onChange={(e) => setFormFloor(e.target.value)}
                    placeholder="如：3F" className="w-full h-9 px-3 rounded-lg border border-panel-border text-sm bg-bg-page outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>

              {/* 门牌号 + 容纳人数 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">门牌号 *</label>
                  <input value={formRoomNumber} onChange={(e) => setFormRoomNumber(e.target.value)}
                    placeholder="如：A-301" className="w-full h-9 px-3 rounded-lg border border-panel-border text-sm bg-bg-page outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">容纳人数</label>
                  <input type="number" min={1} max={500} value={formCapacity} onChange={(e) => setFormCapacity(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-panel-border text-sm bg-bg-page outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>

              {/* 设备 */}
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">设备设施</label>
                <div className="flex flex-wrap gap-2">
                  {FACILITY_OPTIONS.map((f) => (
                    <button key={f} onClick={() => toggleFacility(f)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border transition-colors
                        ${formFacilities.includes(f)
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "border-panel-border text-text-secondary hover:bg-list-hover"}`}>
                      {formFacilities.includes(f) && <Check size={11} />}
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* 状态（仅编辑时） */}
              {editingRoom && (
                <div>
                  <label className="block text-xs text-text-secondary mb-1">状态</label>
                  <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as RoomStatus)}
                    className="w-full h-9 px-3 rounded-lg border border-panel-border text-sm bg-bg-page outline-none">
                    <option value="available">可用</option>
                    <option value="maintenance">维护中</option>
                    <option value="disabled">已停用</option>
                  </select>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-panel-border flex justify-end gap-2">
              <button onClick={resetForm}
                className="px-4 py-2 text-sm text-text-secondary hover:bg-list-hover rounded-lg transition-colors">
                取消
              </button>
              <button onClick={handleSubmit} disabled={submitting || !formName.trim() || !formBuilding.trim() || !formRoomNumber.trim()}
                className="flex items-center gap-1.5 px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium
                  hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {editingRoom ? "保存" : "创建"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
