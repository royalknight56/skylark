/**
 * 管理后台 Layout
 * 左侧管理导航 + owner 权限校验
 * @author skylark
 */

"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  Users,
  Building2,
  Settings,
  ScrollText,
  ClipboardCheck,
  ArrowLeft,
  Loader2,
  ShieldX,
} from "lucide-react";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";

/** 管理后台导航项 */
const adminNav = [
  { icon: BarChart3, label: "仪表盘", href: "/admin" },
  { icon: Users, label: "成员管理", href: "/admin/members" },
  { icon: Building2, label: "部门管理", href: "/admin/departments" },
  { icon: Settings, label: "企业设置", href: "/admin/settings" },
  { icon: ClipboardCheck, label: "加入审批", href: "/admin/join-requests" },
  { icon: ScrollText, label: "操作日志", href: "/admin/logs" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { currentOrg, loading: orgLoading } = useOrg();
  const { user } = useAuth();
  const [isOwner, setIsOwner] = useState<boolean | null>(null);

  /** 校验当前用户是否为 owner */
  useEffect(() => {
    if (!currentOrg || !user) return;
    if (currentOrg.owner_id === user.id) {
      setIsOwner(true);
    } else {
      setIsOwner(false);
    }
  }, [currentOrg, user]);

  if (orgLoading || isOwner === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  /* 非 owner → 403 */
  if (!isOwner) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-text-secondary">
        <ShieldX size={48} className="text-text-placeholder" />
        <p className="text-lg font-medium">无权访问管理后台</p>
        <p className="text-sm text-text-placeholder">仅企业创建者可进入</p>
        <Link
          href="/messages"
          className="mt-4 text-sm text-primary hover:underline flex items-center gap-1"
        >
          <ArrowLeft size={14} />
          返回工作区
        </Link>
      </div>
    );
  }

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* 管理后台侧栏 */}
      <aside className="w-56 bg-panel-bg border-r border-panel-border flex flex-col shrink-0">
        {/* 头部 */}
        <div className="px-4 py-5 border-b border-panel-border">
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={18} className="text-primary" />
            <h2 className="text-sm font-bold text-text-primary">管理后台</h2>
          </div>
          <p className="text-xs text-text-placeholder truncate">
            {currentOrg?.name}
          </p>
        </div>

        {/* 导航 */}
        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
          {adminNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
                  ${active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-text-secondary hover:bg-list-hover hover:text-text-primary"
                  }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 返回按钮 */}
        <div className="px-2 py-3 border-t border-panel-border">
          <Link
            href="/messages"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-list-hover transition-colors"
          >
            <ArrowLeft size={16} />
            返回工作区
          </Link>
        </div>
      </aside>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto bg-bg-page p-6">
        {children}
      </div>
    </div>
  );
}
