/**
 * 管理后台 - 操作日志页面
 * 时间线形式 + 分页
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useOrg } from "@/lib/org-context";
import type { AdminLog } from "@/lib/types";

/** 操作类型中文映射 */
const ACTION_LABELS: Record<string, string> = {
  update_role: "变更角色",
  remove_member: "移除成员",
  create_department: "创建部门",
  update_department: "编辑部门",
  delete_department: "删除部门",
  update_settings: "更新企业设置",
  regenerate_invite_code: "重新生成邀请码",
  approve_join: "批准加入申请",
  reject_join: "拒绝加入申请",
};

const PAGE_SIZE = 20;

export default function AdminLogs() {
  const { currentOrg } = useOrg();
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(() => {
    if (!currentOrg) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/admin/logs?org_id=${currentOrg.id}&page=${page}&page_size=${PAGE_SIZE}`)
      .then((res) => res.json() as Promise<{ success: boolean; data?: AdminLog[]; total?: number }>)
      .then((json) => {
        if (json.success && json.data) {
          setLogs(json.data);
          setTotal(json.total ?? 0);
        }
      })
      .finally(() => setLoading(false));
  }, [currentOrg, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

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
      <h1 className="text-xl font-bold text-text-primary mb-6">操作日志</h1>

      {logs.length === 0 ? (
        <p className="text-center text-text-placeholder text-sm py-16">暂无操作日志</p>
      ) : (
        <>
          {/* 时间线 */}
          <div className="space-y-0">
            {logs.map((log, idx) => (
              <div key={log.id} className="flex gap-4">
                {/* 时间线连接线 */}
                <div className="flex flex-col items-center w-6 shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary/60 mt-1.5 shrink-0" />
                  {idx < logs.length - 1 && <div className="w-px flex-1 bg-panel-border" />}
                </div>

                {/* 日志内容 */}
                <div className="flex-1 pb-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-text-primary">
                        <span className="font-medium">{log.operator?.name || "系统"}</span>
                        <span className="text-text-secondary mx-1.5">
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </p>
                      {log.detail && (
                        <p className="text-xs text-text-placeholder mt-1">{log.detail}</p>
                      )}
                    </div>
                    <span className="text-xs text-text-placeholder shrink-0 mt-0.5">
                      {formatTime(log.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg hover:bg-list-hover transition-colors disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-text-secondary">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-lg hover:bg-list-hover transition-colors disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
