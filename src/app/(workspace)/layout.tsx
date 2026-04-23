/**
 * 工作区布局 - 三栏式结构
 * 包含登录态校验 + OrgProvider + Sidebar
 * @author skylark
 */

"use client";

import { Loader2 } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import { OrgProvider } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg-page">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <OrgProvider>
      <div className="flex h-screen w-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex overflow-hidden">{children}</main>
      </div>
    </OrgProvider>
  );
}
