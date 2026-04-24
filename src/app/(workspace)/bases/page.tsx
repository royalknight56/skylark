/**
 * 多维表格列表页
 * @author skylark
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Loader2, Table2, MoreHorizontal, Trash2,
  Search, LayoutGrid,
} from "lucide-react";
import { useOrg } from "@/lib/org-context";
import type { Base } from "@/lib/types";

export default function BasesPage() {
  const { currentOrg } = useOrg();
  const router = useRouter();
  const [bases, setBases] = useState<Base[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);

  /** 加载列表 */
  useEffect(() => {
    if (!currentOrg) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/bases?org_id=${currentOrg.id}`)
      .then((r) => r.json() as Promise<{ success: boolean; data?: Base[] }>)
      .then((json) => { if (json.success && json.data) setBases(json.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentOrg?.id, currentOrg]);

  /** 新建多维表格 */
  const handleCreate = async () => {
    if (!currentOrg || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/bases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: currentOrg.id, name: "无标题多维表格" }),
      });
      const json = (await res.json()) as { success: boolean; data?: Base };
      if (json.success && json.data) {
        router.push(`/bases/${json.data.id}`);
      }
    } catch { /* ignore */ }
    finally { setCreating(false); }
  };

  /** 删除多维表格 */
  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/bases/${id}`, { method: "DELETE" });
      setBases((prev) => prev.filter((b) => b.id !== id));
    } catch { /* ignore */ }
    setMenuId(null);
  };

  /** 搜索过滤 */
  const filtered = searchText
    ? bases.filter((b) => b.name.toLowerCase().includes(searchText.toLowerCase()))
    : bases;

  /** 格式化时间 */
  const formatTime = (str: string) => {
    const d = new Date(str);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    if (diff < 172800000) return "昨天";
    return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-page">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-bg-page overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* 页头 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <LayoutGrid size={22} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">多维表格</h1>
              <p className="text-xs text-text-secondary">创建和管理结构化数据</p>
            </div>
          </div>
          <button onClick={handleCreate} disabled={creating}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium
              hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm">
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            新建多维表格
          </button>
        </div>

        {/* 搜索框 */}
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-placeholder" />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="搜索多维表格…"
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-panel-bg border border-panel-border text-sm
              text-text-primary placeholder:text-text-placeholder outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* 表格列表 */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-placeholder">
            <Table2 size={48} className="mb-4 opacity-30" />
            <p className="text-sm">{bases.length === 0 ? "暂无多维表格，点击上方按钮新建" : "未找到匹配的表格"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((base) => (
              <div
                key={base.id}
                onClick={() => router.push(`/bases/${base.id}`)}
                className="group relative bg-panel-bg rounded-xl border border-panel-border p-4 cursor-pointer
                  hover:shadow-lg hover:border-primary/30 transition-all"
              >
                {/* 图标 + 标题 */}
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">{base.icon || "📊"}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-text-primary truncate">{base.name}</h3>
                    {base.description && (
                      <p className="text-xs text-text-secondary mt-0.5 truncate">{base.description}</p>
                    )}
                  </div>
                  {/* 菜单 */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuId(menuId === base.id ? null : base.id); }}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-text-placeholder
                      hover:bg-list-hover opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                  {menuId === base.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMenuId(null); }} />
                      <div className="absolute right-4 top-12 w-32 bg-panel-bg rounded-lg shadow-lg border border-panel-border z-50 py-1">
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(base.id); }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">
                          <Trash2 size={12} /> 删除
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* 元信息 */}
                <div className="flex items-center gap-3 text-[10px] text-text-placeholder">
                  <span>{base.table_count || 0} 张数据表</span>
                  <span>·</span>
                  <span>{base.creator?.name || "我"}</span>
                  <span>·</span>
                  <span>{formatTime(base.updated_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
