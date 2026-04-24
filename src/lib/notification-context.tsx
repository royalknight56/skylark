/**
 * 全局通知上下文
 * 维护到 NotificationHub DO 的 WebSocket 长连接
 * 接收实时消息通知，弹出 Toast + 浏览器通知 + 更新未读计数
 * @author skylark
 */

"use client";

import {
  createContext, useContext, useState, useEffect, useRef, useCallback,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "./auth-context";
import { useToast } from "@/components/ui/Toast";

/** 通知事件负载类型 */
export interface NotifyEvent {
  type: "new_message";
  payload: {
    conversation_id: string;
    conversation_name: string | null;
    conversation_type: string;
    message_id: string;
    sender_id: string;
    sender_name: string;
    sender_avatar: string | null;
    content: string;
    message_type: string;
    created_at: string;
  };
  timestamp: string;
}

interface NotificationContextValue {
  /** 全局未读总数 */
  totalUnread: number;
  /** 手动增减未读 */
  setTotalUnread: (n: number | ((prev: number) => number)) => void;
  /** 最新通知事件（供会话列表等消费） */
  lastEvent: NotifyEvent | null;
}

const NotificationContext = createContext<NotificationContextValue>({
  totalUnread: 0,
  setTotalUnread: () => {},
  lastEvent: null,
});

export function useNotification() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const pathname = usePathname();
  const [totalUnread, setTotalUnread] = useState(0);
  const [lastEvent, setLastEvent] = useState<NotifyEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pathnameRef = useRef(pathname);
  const browserNotifRef = useRef(false);

  // 实时追踪当前路径
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // 请求浏览器通知权限
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().then((perm) => {
          browserNotifRef.current = perm === "granted";
        });
      } else {
        browserNotifRef.current = Notification.permission === "granted";
      }
    }
  }, []);

  // 初始化未读总数
  useEffect(() => {
    if (!user) return;
    fetch("/api/conversations/unread-total")
      .then((r) => r.json())
      .then((json: unknown) => {
        const result = json as { success: boolean; data?: { total: number } };
        if (result.success && result.data) {
          setTotalUnread(result.data.total);
        }
      })
      .catch(() => {});
  }, [user]);

  // WebSocket 连接
  useEffect(() => {
    if (!user) return;

    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let pingTimer: ReturnType<typeof setInterval>;

    const connect = () => {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${proto}//${window.location.host}/api/ws/notify`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // 每 30s 发心跳保持连接
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as NotifyEvent;

          if (data.type === "new_message") {
            setLastEvent(data);

            // 如果不在当前会话页，增加未读计数
            const currentConvPath = `/messages/${data.payload.conversation_id}`;
            const isViewingConv = pathnameRef.current === currentConvPath;

            if (!isViewingConv) {
              setTotalUnread((prev) => prev + 1);

              // 内容预览（截断）
              const preview = data.payload.message_type === "image"
                ? "[图片]"
                : data.payload.message_type === "file"
                ? "[文件]"
                : data.payload.content.length > 40
                ? data.payload.content.slice(0, 40) + "..."
                : data.payload.content;

              const title = data.payload.conversation_name || data.payload.sender_name;

              // Toast 应用内通知
              showToast({
                title,
                body: data.payload.conversation_name
                  ? `${data.payload.sender_name}: ${preview}`
                  : preview,
                avatar: {
                  name: data.payload.sender_name,
                  url: data.payload.sender_avatar,
                },
                href: `/messages/${data.payload.conversation_id}`,
              });

              // 浏览器原生通知（页面不在前台时）
              if (browserNotifRef.current && document.hidden) {
                try {
                  new Notification(title, {
                    body: data.payload.conversation_name
                      ? `${data.payload.sender_name}: ${preview}`
                      : preview,
                    icon: "/favicon.ico",
                    tag: data.payload.conversation_id,
                  });
                } catch {
                  // 浏览器通知失败不影响
                }
              }
            }
          }
        } catch {
          // 忽略无法解析的消息
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        clearInterval(pingTimer);
        if (!closed) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      closed = true;
      clearTimeout(reconnectTimer);
      clearInterval(pingTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user, showToast]);

  return (
    <NotificationContext.Provider value={{ totalUnread, setTotalUnread, lastEvent }}>
      {children}
    </NotificationContext.Provider>
  );
}
