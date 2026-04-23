/**
 * 管理后台 - 仪表盘页面
 * 展示企业统计卡片
 * @author skylark
 */

"use client";

import { useState, useEffect } from "react";
import { Users, MessageSquare, FileText, UserPlus, Clock } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useOrg } from "@/lib/org-context";
import type { OrgStats } from "@/lib/types";

/** 统计卡片配置 */
const statCards = [
  { key: "total_members" as const, label: "总成员数", icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
  { key: "new_members_this_week" as const, label: "本周新增", icon: UserPlus, color: "text-green-500", bg: "bg-green-50" },
  { key: "total_messages" as const, label: "消息总量", icon: MessageSquare, color: "text-purple-500", bg: "bg-purple-50" },
  { key: "total_documents" as const, label: "文档总数", icon: FileText, color: "text-orange-500", bg: "bg-orange-50" },
  { key: "pending_requests" as const, label: "待审批申请", icon: Clock, color: "text-red-500", bg: "bg-red-50" },
];

export default function AdminDashboard() {
  const { currentOrg } = useOrg();
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOrg) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/admin/stats?org_id=${currentOrg.id}`)
      .then((res) => res.json() as Promise<{ success: boolean; data?: OrgStats }>)
      .then((json) => {
        if (json.success && json.data) setStats(json.data);
      })
      .finally(() => setLoading(false));
  }, [currentOrg]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-bold text-text-primary mb-6">数据概览</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const value = stats?.[card.key] ?? 0;
          return (
            <div
              key={card.key}
              className="bg-panel-bg rounded-xl border border-panel-border p-5 flex items-center gap-4"
            >
              <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                <Icon size={22} className={card.color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{value}</p>
                <p className="text-xs text-text-placeholder mt-0.5">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
