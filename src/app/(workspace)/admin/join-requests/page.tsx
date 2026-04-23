/**
 * 管理后台 - 加入审批页面
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { useOrg } from "@/lib/org-context";
import type { JoinRequest } from "@/lib/types";

const STATUS_CONFIG = {
  pending: { label: "待审批", icon: Clock, color: "text-yellow-500", bg: "bg-yellow-50" },
  approved: { label: "已通过", icon: CheckCircle, color: "text-green-500", bg: "bg-green-50" },
  rejected: { label: "已拒绝", icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
} as const;

export default function AdminJoinRequests() {
  const { currentOrg } = useOrg();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");

  const fetchRequests = useCallback(() => {
    if (!currentOrg) { setLoading(false); return; }
    setLoading(true);
    const url = filter
      ? `/api/admin/join-requests?org_id=${currentOrg.id}&status=${filter}`
      : `/api/admin/join-requests?org_id=${currentOrg.id}`;
    fetch(url)
      .then((res) => res.json() as Promise<{ success: boolean; data?: JoinRequest[] }>)
      .then((json) => {
        if (json.success && json.data) setRequests(json.data);
      })
      .finally(() => setLoading(false));
  }, [currentOrg, filter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  /** 审批操作 */
  const handleReview = async (requestId: string, approved: boolean) => {
    if (!currentOrg) return;
    await fetch("/api/admin/join-requests", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_id: currentOrg.id, request_id: requestId, approved }),
    });
    fetchRequests();
  };

  /** 格式化时间 */
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-text-primary mb-6">加入审批</h1>

      {/* 状态筛选 */}
      <div className="flex gap-2 mb-4">
        {(["pending", "approved", "rejected", ""] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${filter === s
                ? "bg-primary text-white"
                : "bg-panel-bg border border-panel-border text-text-secondary hover:bg-list-hover"
              }`}
          >
            {s === "" ? "全部" : STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {/* 申请列表 */}
      {requests.length === 0 ? (
        <p className="text-center text-text-placeholder text-sm py-16">暂无申请</p>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const statusConf = STATUS_CONFIG[req.status];
            const StatusIcon = statusConf.icon;
            return (
              <div
                key={req.id}
                className="bg-panel-bg rounded-xl border border-panel-border p-4 flex items-center gap-4"
              >
                {/* 用户头像 */}
                <div className="w-10 h-10 rounded-full avatar-placeholder avatar-blue text-sm shrink-0">
                  {req.user?.name?.charAt(0) || "?"}
                </div>

                {/* 申请信息 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    {req.user?.name || "未知用户"}
                  </p>
                  <p className="text-xs text-text-placeholder">{req.user?.email}</p>
                  {req.message && (
                    <p className="text-xs text-text-secondary mt-1">"{req.message}"</p>
                  )}
                </div>

                {/* 时间 */}
                <span className="text-xs text-text-placeholder shrink-0">
                  {formatTime(req.created_at)}
                </span>

                {/* 状态 / 操作 */}
                {req.status === "pending" ? (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleReview(req.id, true)}
                      className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                      title="通过"
                    >
                      <CheckCircle size={18} />
                    </button>
                    <button
                      onClick={() => handleReview(req.id, false)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                      title="拒绝"
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                ) : (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${statusConf.bg} ${statusConf.color}`}>
                    <StatusIcon size={13} />
                    {statusConf.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
