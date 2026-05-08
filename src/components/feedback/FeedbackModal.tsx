/**
 * 产品问题反馈弹窗
 * @author skylark
 */

"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, MessageSquareWarning, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useOrg } from "@/lib/org-context";

type FeedbackType = "bug" | "suggestion" | "experience" | "other";

interface FeedbackModalProps {
  onClose: () => void;
}

const typeOptions: { value: FeedbackType; label: string }[] = [
  { value: "bug", label: "产品问题" },
  { value: "experience", label: "体验反馈" },
  { value: "suggestion", label: "功能建议" },
  { value: "other", label: "其他" },
];

export default function FeedbackModal({ onClose }: FeedbackModalProps) {
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const [type, setType] = useState<FeedbackType>("bug");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contact, setContact] = useState(user?.email || "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = title.trim().length > 0 && content.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: currentOrg?.id || null,
          type,
          title,
          content,
          contact,
          page_url: window.location.href,
          user_agent: navigator.userAgent,
        }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error || "提交失败");
      setSubmitted(true);
      setTitle("");
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-panel-bg rounded-xl shadow-2xl border border-panel-border overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="h-14 px-5 flex items-center justify-between border-b border-panel-border">
          <div className="flex items-center gap-2">
            <MessageSquareWarning size={18} className="text-primary" />
            <h2 className="text-base font-semibold text-text-primary">问题反馈</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-text-placeholder hover:bg-list-hover"
            title="关闭"
          >
            <X size={16} />
          </button>
        </div>

        {submitted ? (
          <div className="px-5 py-8 text-center">
            <CheckCircle2 size={40} className="mx-auto text-success mb-3" />
            <h3 className="text-base font-semibold text-text-primary">反馈已提交</h3>
            <p className="text-sm text-text-secondary mt-2">谢谢你帮忙把产品打磨得更好。</p>
            <button
              onClick={onClose}
              className="mt-5 h-9 px-4 rounded-lg bg-primary text-white text-sm hover:bg-primary/90"
            >
              完成
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">反馈类型</label>
              <div className="grid grid-cols-4 gap-2">
                {typeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setType(option.value)}
                    className={`h-8 rounded-lg text-xs font-medium border transition-colors
                      ${type === option.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-panel-border text-text-secondary hover:bg-list-hover"
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">标题</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
                placeholder="一句话说明你遇到的问题"
                className="w-full h-10 rounded-lg border border-panel-border px-3 text-sm text-text-primary bg-panel-bg outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">问题描述</label>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                maxLength={3000}
                placeholder="发生了什么、期望是什么、是否能稳定复现"
                className="w-full h-32 rounded-lg border border-panel-border p-3 text-sm text-text-primary bg-panel-bg outline-none resize-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">联系方式</label>
              <input
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                maxLength={200}
                placeholder="邮箱、手机号或其他联系方式"
                className="w-full h-10 rounded-lg border border-panel-border px-3 text-sm text-text-primary bg-panel-bg outline-none focus:border-primary"
              />
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-danger">{error}</p>}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button onClick={onClose}
                className="h-9 px-4 rounded-lg border border-panel-border text-sm text-text-secondary hover:bg-list-hover">
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="h-9 px-4 rounded-lg bg-primary text-white text-sm flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                提交反馈
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
