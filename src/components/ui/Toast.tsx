/**
 * 轻量级 Toast 通知组件
 * 支持从右上角弹出，自动消失
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import { X, MessageSquare } from "lucide-react";
import Avatar from "./Avatar";

interface ToastItem {
  id: string;
  title: string;
  body: string;
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
      <div className="fixed top-4 right-4 z-300 flex flex-col gap-2 pointer-events-none">
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
      className="pointer-events-auto w-80 bg-panel-bg rounded-xl shadow-lg border border-panel-border 
        animate-in slide-in-from-right fade-in duration-300
        cursor-pointer hover:shadow-xl transition-shadow overflow-hidden"
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
          <p className="text-sm font-medium text-text-primary truncate">{toast.title}</p>
          <p className="text-xs text-text-secondary truncate mt-0.5">{toast.body}</p>
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-text-placeholder hover:text-text-secondary hover:bg-list-hover transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      {/* 底部进度条 */}
      <div className="h-0.5 bg-primary/20">
        <div
          className="h-full bg-primary rounded-full"
          style={{ animation: `shrink ${toast.duration || 5000}ms linear forwards` }}
        />
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
