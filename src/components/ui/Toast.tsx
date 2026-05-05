/**
 * 轻量级 Toast 通知组件
 * 支持从右上角弹出，自动消失
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import { ChevronRight, MessageSquare, X } from "lucide-react";
import Avatar from "./Avatar";

interface ToastItem {
  id: string;
  variant?: "default" | "message";
  title: string;
  body: string;
  subtitle?: string;
  avatar?: { name: string; url?: string | null };
  /** 点击跳转的路径 */
  href?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, "id">) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((t: Omit<ToastItem, "id">) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-4), { ...t, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* 通知容器 - 右上角 */}
      <div className="fixed top-4 right-4 z-[300] flex flex-col gap-2 pointer-events-none max-sm:left-3 max-sm:right-3">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, toast.duration || 5000);
    return () => clearTimeout(timer);
  }, [toast.duration, onClose]);

  const handleClick = () => {
    if (toast.href) {
      window.location.href = toast.href;
    }
    onClose();
  };

  return (
    <div
      onClick={handleClick}
      className={`pointer-events-auto w-80 max-sm:w-full bg-panel-bg rounded-lg shadow-lg border border-panel-border
        cursor-pointer hover:shadow-xl transition-shadow overflow-hidden toast-enter
        ${toast.variant === "message" ? "border-primary/20 shadow-primary/10" : ""}`}
    >
      <div className="flex items-start gap-3 p-3">
        {/* 头像/图标 */}
        {toast.avatar ? (
          <Avatar name={toast.avatar.name} avatarUrl={toast.avatar.url} size="sm" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <MessageSquare size={16} className="text-primary" />
          </div>
        )}

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          {toast.variant === "message" && (
            <div className="flex items-center gap-1.5 mb-0.5">
              <MessageSquare size={12} className="text-primary shrink-0" />
              <span className="text-[11px] font-medium text-primary">新消息</span>
            </div>
          )}
          <p className="text-sm font-medium text-text-primary truncate">{toast.title}</p>
          {toast.subtitle && (
            <p className="text-[11px] text-text-placeholder truncate mt-0.5">{toast.subtitle}</p>
          )}
          <p className={`${toast.variant === "message" ? "text-sm" : "text-xs"} text-text-secondary line-clamp-2 mt-1`}>
            {toast.body}
          </p>
        </div>

        {/* 关闭按钮 */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-text-placeholder hover:text-text-secondary hover:bg-list-hover transition-colors"
          aria-label="关闭通知"
        >
          <X size={12} />
        </button>
      </div>

      {toast.variant === "message" && toast.href && (
        <div className="mx-3 mb-3 flex items-center justify-between rounded-md bg-primary/5 px-2.5 py-1.5 text-xs font-medium text-primary">
          <span>查看消息</span>
          <ChevronRight size={14} />
        </div>
      )}

      {/* 底部进度条 */}
      <div className="h-0.5 bg-primary/20">
        <div
          className="h-full bg-primary rounded-full"
          style={{ animation: `shrink ${toast.duration || 5000}ms linear forwards` }}
        />
      </div>

      <style>{`
        .toast-enter {
          animation: toast-enter 180ms ease-out;
        }
        @keyframes toast-enter {
          from { opacity: 0; transform: translateX(16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
