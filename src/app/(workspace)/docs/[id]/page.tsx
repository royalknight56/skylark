/**
 * 云文档独立页面 — 通过链接直接打开单篇文档
 * 路由：/docs/[id]
 * @author skylark
 */

"use client";

import { useState, useEffect, use } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import ShareDocModal from "@/components/docs/ShareDocModal";
import type { Document } from "@/lib/types";

const DocEditor = dynamic(() => import("@/components/docs/DocEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-bg-page">
      <Loader2 size={28} className="text-primary animate-spin" />
    </div>
  ),
});

export default function DocDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showShare, setShowShare] = useState(false);

  /** 加载文档 */
  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/docs/${id}`)
      .then((r) => r.json() as Promise<{ success: boolean; data?: Document; error?: string }>)
      .then((json) => {
        if (json.success && json.data) {
          setDoc(json.data);
        } else {
          setError(json.error || "文档不存在");
        }
      })
      .catch(() => setError("加载失败"))
      .finally(() => setLoading(false));
  }, [id]);

  /** 保存回调 */
  const handleSave = async (content: string, title: string) => {
    if (!doc) return;
    try {
      const res = await fetch(`/api/docs/${doc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, title }),
      });
      const json = (await res.json()) as { success: boolean; data?: Document };
      if (json.success && json.data) setDoc(json.data);
    } catch { /* 静默失败 */ }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-page">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-bg-page gap-4">
        <AlertCircle size={48} className="text-text-placeholder" />
        <p className="text-lg font-medium text-text-secondary">{error || "文档不存在"}</p>
        <button onClick={() => router.push("/docs")}
          className="text-sm text-primary hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> 返回云文档
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 返回按钮 */}
      <div className="h-10 px-4 flex items-center border-b border-panel-border bg-panel-bg shrink-0">
        <button onClick={() => router.push("/docs")}
          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors">
          <ArrowLeft size={14} /> 返回云文档
        </button>
      </div>

      {/* 复用 DocEditor */}
      <DocEditor
        document={doc}
        onSave={handleSave}
        onShare={(d) => setShowShare(true)}
      />

      {showShare && (
        <ShareDocModal document={doc} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}
