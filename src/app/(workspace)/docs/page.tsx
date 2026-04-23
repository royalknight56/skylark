/**
 * 云文档页面
 * @author skylark
 */

"use client";

import { useState, useEffect } from "react";
import { FileText, Loader2 } from "lucide-react";
import DocList from "@/components/docs/DocList";
import DocEditor from "@/components/docs/DocEditor";
import { useOrg } from "@/lib/org-context";
import type { Document as DocType } from "@/lib/types";

export default function DocsPage() {
  const { currentOrg } = useOrg();
  const [docs, setDocs] = useState<DocType[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocType | null>(null);
  const [loading, setLoading] = useState(true);

  /** 从 API 获取文档列表 */
  useEffect(() => {
    if (!currentOrg) { setLoading(false); return; }
    setLoading(true);
    setSelectedDoc(null);

    fetch(`/api/docs?org_id=${currentOrg.id}`)
      .then((res) => res.json() as Promise<{ success: boolean; data?: DocType[] }>)
      .then((json) => {
        if (json.success && json.data) setDocs(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentOrg?.id, currentOrg]);

  /** 新建文档（通过 API） */
  const handleCreateNew = async (type: "doc" | "sheet") => {
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
    } catch {
      // 创建失败
    }
  };

  /** 保存文档（通过 API） */
  const handleSave = async (content: string, title: string) => {
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
      // 保存失败时本地更新
      const updated = { ...selectedDoc, content, title, updated_at: new Date().toISOString() };
      setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setSelectedDoc(updated);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-page">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <>
      <DocList
        documents={docs}
        selectedId={selectedDoc?.id}
        onSelect={setSelectedDoc}
        onCreateNew={handleCreateNew}
      />
      {selectedDoc ? (
        <DocEditor document={selectedDoc} onSave={handleSave} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-bg-page">
          <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center mb-4">
            <FileText size={32} className="text-primary" />
          </div>
          <p className="text-text-secondary text-sm">选择或新建文档开始编辑</p>
        </div>
      )}
    </>
  );
}
