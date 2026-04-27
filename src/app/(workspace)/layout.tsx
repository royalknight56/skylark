/**
 * 工作区布局 - 三栏式结构
 * 包含登录态校验 + OrgProvider + Sidebar + 暂停账号拦截
 * @author skylark
 */

"use client";

import { Loader2, ShieldOff } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import { OrgProvider, useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";

/** 账号暂停/离职遮罩 */
function SuspendedOverlay() {
  const { isSuspended, currentOrg } = useOrg();
  if (!isSuspended) return null;

  const isDeparted = currentOrg?.member_status === 'departed';

  return (
    <div className="absolute inset-0 z-50 bg-bg-page/90 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-bg-panel border border-panel-border rounded-2xl shadow-lg p-10 max-w-md text-center space-y-4">
        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${isDeparted ? 'bg-gray-100' : 'bg-red-100'}`}>
          <ShieldOff size={32} className={isDeparted ? 'text-gray-500' : 'text-red-500'} />
        </div>
        <h2 className="text-xl font-bold text-text-primary">{isDeparted ? '您已离职' : '账号已冻结'}</h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          {isDeparted
            ? <>您在 <span className="font-medium">{currentOrg?.name}</span> 中的账号已被管理员操作离职，无法继续使用该企业的功能。</>
            : <>您在 <span className="font-medium">{currentOrg?.name}</span> 中的账号已被管理员暂停。暂停期间无法使用该企业的任何功能。</>
          }
        </p>
        <p className="text-xs text-text-tertiary">如有疑问，请联系企业管理员。</p>
      </div>
    </div>
  );
}

/** 内部布局（需在 OrgProvider 内部使用 useOrg） */
function WorkspaceInner({ children }: { children: React.ReactNode }) {
  return (
    <div className="workspace-shell flex flex-col-reverse md:flex-row">
      <Sidebar />
      <main className="flex-1 min-h-0 flex overflow-hidden relative">
        <SuspendedOverlay />
        {children}
      </main>
    </div>
  );
}

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="workspace-shell flex items-center justify-center bg-bg-page">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <OrgProvider>
      <WorkspaceInner>{children}</WorkspaceInner>
    </OrgProvider>
  );
}
