/**
 * 云文档页面
 * Tab 切换：文档 / 多维表格
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Loader2, Plus, Table2,
  Search, MoreHorizontal, Trash2, LayoutGrid, Pencil,
} from "lucide-react";
import DocList from "@/components/docs/DocList";
import DocEditor from "@/components/docs/DocEditor";
import ShareDocModal from "@/components/docs/ShareDocModal";
import { useOrg } from "@/lib/org-context";
import type { Document as DocType, Base } from "@/lib/types";

type ActiveTab = "docs" | "bases";

export default function DocsPage() {
  const { currentOrg } = useOrg();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>("docs");

  /* ==================== 分享弹窗 ==================== */
  const [shareDoc, setShareDoc] = useState<DocType | null>(null);

  /* ==================== 文档相关状态 ==================== */
  const [docs, setDocs] = useState<DocType[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocType | null>(null);
  const [docsLoading, setDocsLoading] = useState(true);

  /* ==================== 多维表格相关状态 ==================== */
  const [bases, setBases] = useState<Base[]>([]);
  const [basesLoading, setBasesLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [renamingBaseId, setRenamingBaseId] = useState<string | null>(null);
  const [baseRenameValue, setBaseRenameValue] = useState("");

  /* ==================== 文档逻辑 ==================== */
  useEffect(() => {
    if (!currentOrg) { setDocsLoading(false); return; }
    setDocsLoading(true);
    setSelectedDoc(null);
    fetch(`/api/docs?org_id=${currentOrg.id}`)
      .then((res) => res.json() as Promise<{ success: boolean; data?: DocType[] }>)
      .then((json) => { if (json.success && json.data) setDocs(json.data); })
      .catch(() => {})
      .finally(() => setDocsLoading(false));
  }, [currentOrg?.id, currentOrg]);

  const handleCreateDoc = async (type: "doc" | "sheet") => {
    if (!currentOrg) return;
    try {
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: currentOrg.id,
          title: type === "doc" ? "无标题文档" : "无标题表格",
          type,
        }),
      });
      const json = (await res.json()) as { success: boolean; data?: DocType };
      if (json.success && json.data) {
        setDocs((prev) => [json.data!, ...prev]);
        setSelectedDoc(json.data);
      }
    } catch { /* ignore */ }
  };

  const handleSaveDoc = async (content: string, title: string) => {
    if (!selectedDoc) return;
    try {
      const res = await fetch(`/api/docs/${selectedDoc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, title }),
      });
      const json = (await res.json()) as { success: boolean; data?: DocType };
      if (json.success && json.data) {
        setDocs((prev) => prev.map((d) => (d.id === json.data!.id ? json.data! : d)));
        setSelectedDoc(json.data);
      }
    } catch {
      const updated = { ...selectedDoc, content, title, updated_at: new Date().toISOString() };
      setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setSelectedDoc(updated);
    }
  };

  /** 重命名文档 */
  const handleRenameDoc = async (doc: DocType, newTitle: string) => {
    try {
      const res = await fetch(`/api/docs/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      const json = (await res.json()) as { success: boolean; data?: DocType };
      if (json.success && json.data) {
        setDocs((prev) => prev.map((d) => (d.id === json.data!.id ? json.data! : d)));
        if (selectedDoc?.id === doc.id) setSelectedDoc(json.data);
      }
    } catch { /* ignore */ }
  };

  /** 删除文档 */
  const handleDeleteDoc = async (doc: DocType) => {
    try {
      await fetch(`/api/docs/${doc.id}`, { method: "DELETE" });
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      if (selectedDoc?.id === doc.id) setSelectedDoc(null);
    } catch { /* ignore */ }
  };

  /* ==================== 多维表格逻辑 ==================== */
  const loadBases = useCallback(() => {
    if (!currentOrg) { setBasesLoading(false); return; }
    setBasesLoading(true);
    fetch(`/api/bases?org_id=${currentOrg.id}`)
      .then((r) => r.json() as Promise<{ success: boolean; data?: Base[] }>)
      .then((json) => { if (json.success && json.data) setBases(json.data); })
      .catch(() => {})
      .finally(() => setBasesLoading(false));
  }, [currentOrg]);

  useEffect(() => { loadBases(); }, [loadBases]);

  const handleCreateBase = async () => {
    if (!currentOrg || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/bases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: currentOrg.id, name: "无标题多维表格" }),
      });
      const json = (await res.json()) as { success: boolean; data?: Base };
      if (json.success && json.data) router.push(`/bases/${json.data.id}`);
    } catch { /* ignore */ }
    finally { setCreating(false); }
  };

  const handleDeleteBase = async (id: string) => {
    try {
      await fetch(`/api/bases/${id}`, { method: "DELETE" });
      setBases((prev) => prev.filter((b) => b.id !== id));
    } catch { /* ignore */ }
    setMenuId(null);
  };

  /** 重命名多维表格 */
  const handleRenameBase = async (id: string, newName: string) => {
    try {
      const res = await fetch(`/api/bases/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const json = (await res.json()) as { success: boolean };
      if (json.success) {
        setBases((prev) => prev.map((b) => (b.id === id ? { ...b, name: newName } : b)));
      }
    } catch { /* ignore */ }
  };

  const filteredBases = searchText
    ? bases.filter((b) => b.name.toLowerCase().includes(searchText.toLowerCase()))
    : bases;

  const formatTime = (str: string) => {
    const d = new Date(str);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    if (diff < 172800000) return "昨天";
    return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  };

  /* ==================== 渲染 ==================== */
  const isLoading = activeTab === "docs" ? docsLoading : basesLoading;
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-page">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 顶部 Tab 栏 */}
      <div className="h-12 px-6 flex items-center gap-1 border-b border-panel-border bg-panel-bg shrink-0">
        <button onClick={() => setActiveTab("docs")}
          className={`px-4 h-full text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5
            ${activeTab === "docs" ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}>
          <FileText size={15} /> 文档
        </button>
        <button onClick={() => setActiveTab("bases")}
          className={`px-4 h-full text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5
            ${activeTab === "bases" ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}>
          <LayoutGrid size={15} /> 多维表格
          {bases.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-600 font-semibold">{bases.length}</span>
          )}
        </button>
      </div>

      {/* 文档 Tab 内容 */}
      {activeTab === "docs" && (
        <div className="flex-1 flex overflow-hidden">
          <DocList
            documents={docs}
            selectedId={selectedDoc?.id}
            onSelect={setSelectedDoc}
            onCreateNew={handleCreateDoc}
            onShare={setShareDoc}
            onRename={handleRenameDoc}
            onDelete={handleDeleteDoc}
          />
          {selectedDoc ? (
            <DocEditor document={selectedDoc} onSave={handleSaveDoc} onShare={setShareDoc} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-bg-page">
              <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center mb-4">
                <FileText size={32} className="text-primary" />
              </div>
              <p className="text-text-secondary text-sm">选择或新建文档开始编辑</p>
            </div>
          )}
        </div>
      )}

      {/* 多维表格 Tab 内容 */}
      {activeTab === "bases" && (
        <div className="flex-1 bg-bg-page overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 py-8">
            {/* 操作栏 */}
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
              <button onClick={handleCreateBase} disabled={creating}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium
                  hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm">
                {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                新建多维表格
              </button>
            </div>

            {/* 搜索 */}
            <div className="relative mb-4">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-placeholder" />
              <input value={searchText} onChange={(e) => setSearchText(e.target.value)}
                placeholder="搜索多维表格…"
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-panel-bg border border-panel-border text-sm
                  text-text-primary placeholder:text-text-placeholder outline-none focus:ring-2 focus:ring-primary/30" />
            </div>

            {/* 表格卡片网格 */}
            {filteredBases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-text-placeholder">
                <Table2 size={48} className="mb-4 opacity-30" />
                <p className="text-sm">{bases.length === 0 ? "暂无多维表格，点击上方按钮新建" : "未找到匹配的表格"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBases.map((base) => (
                  <div key={base.id}
                    onClick={() => { if (renamingBaseId !== base.id) router.push(`/bases/${base.id}`); }}
                    className="group relative bg-panel-bg rounded-xl border border-panel-border p-4 cursor-pointer
                      hover:shadow-lg hover:border-primary/30 transition-all">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-2xl">{base.icon || "📊"}</span>
                      <div className="flex-1 min-w-0">
                        {renamingBaseId === base.id ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <input autoFocus value={baseRenameValue}
                              onChange={(e) => setBaseRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const v = baseRenameValue.trim();
                                  if (v && v !== base.name) handleRenameBase(base.id, v);
                                  setRenamingBaseId(null);
                                }
                                if (e.key === "Escape") setRenamingBaseId(null);
                              }}
                              onBlur={() => {
                                const v = baseRenameValue.trim();
                                if (v && v !== base.name) handleRenameBase(base.id, v);
                                setRenamingBaseId(null);
                              }}
                              className="flex-1 h-7 px-2 rounded border border-primary text-sm text-text-primary bg-bg-page outline-none" />
                          </div>
                        ) : (
                          <>
                            <h3 className="text-sm font-semibold text-text-primary truncate">{base.name}</h3>
                            {base.description && (
                              <p className="text-xs text-text-secondary mt-0.5 truncate">{base.description}</p>
                            )}
                          </>
                        )}
                      </div>
                      {renamingBaseId !== base.id && (
                        <button onClick={(e) => { e.stopPropagation(); setMenuId(menuId === base.id ? null : base.id); }}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-text-placeholder
                            hover:bg-list-hover opacity-0 group-hover:opacity-100 transition-all">
                          <MoreHorizontal size={14} />
                        </button>
                      )}
                      {menuId === base.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMenuId(null); }} />
                          <div className="absolute right-4 top-12 w-36 bg-panel-bg rounded-lg shadow-lg border border-panel-border z-50 py-1">
                            <button onClick={(e) => {
                              e.stopPropagation();
                              setMenuId(null);
                              setRenamingBaseId(base.id);
                              setBaseRenameValue(base.name);
                            }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-list-hover transition-colors">
                              <Pencil size={12} /> 重命名
                            </button>
                            <div className="h-px bg-panel-border my-1" />
                            <button onClick={(e) => {
                              e.stopPropagation();
                              setMenuId(null);
                              if (confirm(`确定删除「${base.name}」？此操作不可撤销。`)) handleDeleteBase(base.id);
                            }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors">
                              <Trash2 size={12} /> 删除
                            </button>
                          </div>
                        </>
                      )}
                    </div>
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
      )}

      {/* 文档分享弹窗 */}
      {shareDoc && (
        <ShareDocModal document={shareDoc} onClose={() => setShareDoc(null)} />
      )}
    </div>
  );
}
