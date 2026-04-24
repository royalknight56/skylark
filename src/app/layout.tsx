/**
 * 全局根布局 - 包含 AuthProvider + ToastProvider + NotificationProvider
 * @author skylark
 */

import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/ui/Toast";
import { NotificationProvider } from "@/lib/notification-context";

export const metadata: Metadata = {
  title: "Skylark - 即时通讯办公平台",
  description: "基于 Cloudflare 生态的即时通讯与办公协作平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <ToastProvider>
            <NotificationProvider>
              {children}
            </NotificationProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
