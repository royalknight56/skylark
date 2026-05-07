/**
 * 管理后台 Layout
 * 左侧导航 + owner/admin 权限校验 + 按权限动态显示菜单
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  BarChart3, Users, Building2, Settings, ScrollText,
  ClipboardCheck, ArrowLeft, Loader2, ShieldX,
  Bot, DoorOpen, Tag, Shield, Mail,
} from "lucide-react";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import type { AdminPermission } from "@/lib/types";

/** 导航项定义：permission 为 null 表示所有管理员可见 */
interface NavItem {
  icon: typeof BarChart3;
  label: string;
  href: string;
  permission: AdminPermission | null;
}

const adminNav: NavItem[] = [
  { icon: BarChart3,     label: "仪表盘",     href: "/admin",                permission: null },
  { icon: Users,         label: "成员管理",   href: "/admin/members",        permission: "members" },
  { icon: Building2,     label: "部门管理",   href: "/admin/departments",    permission: "departments" },
  { icon: Tag,           label: "人员类型",   href: "/admin/employee-types", permission: "employee_types" },
  { icon: Settings,      label: "企业设置",   href: "/admin/settings",       permission: "settings" },
  { icon: ClipboardCheck,label: "加入审批",   href: "/admin/join-requests",  permission: "join_requests" },
  { icon: DoorOpen,      label: "会议室管理", href: "/admin/rooms",          permission: "rooms" },
  { icon: Bot,           label: "机器人管理", href: "/admin/bots",           permission: "bots" },
  { icon: Mail,          label: "企业邮箱",   href: "/admin/mail",           permission: "mail" },
  { icon: Shield,        label: "管理员权限", href: "/admin/roles",          permission: "roles" },
  { icon: ScrollText,    label: "操作日志",   href: "/admin/logs",           permission: "logs" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentOrg, loading: orgLoading } = useOrg();
  const { user } = useAuth();

  const [accessLevel, setAccessLevel] = useState<"loading" | "denied" | "owner" | "admin">("loading");
  const [permissions, setPermissions] = useState<string[]>([]);

  /** 检查管理权限 */
  const checkAccess = useCallback(async () => {
    if (!currentOrg || !user) return;

    // owner 直接拥有全部权限
    if (currentOrg.owner_id === user.id) {
      setAccessLevel("owner");
      setPermissions(["*"]);
      return;
    }

    // 查询 admin 权限
    try {
      const res = await fetch(`/api/admin/permissions?org_id=${currentOrg.id}`);
      const json = (await res.json()) as {
        success: boolean;
        data?: { role: string; permissions: string[] };
      };
      if (json.success && json.data) {
        if (json.data.role === "owner") {
          setAccessLevel("owner");
          setPermissions(["*"]);
        } else if (json.data.role === "admin" && json.data.permissions.length > 0) {
          setAccessLevel("admin");
          setPermissions(json.data.permissions);
        } else {
          setAccessLevel("denied");
        }
      } else {
        setAccessLevel("denied");
      }
    } catch {
      setAccessLevel("denied");
    }
  }, [currentOrg, user]);

  useEffect(() => { checkAccess(); }, [checkAccess]);

  /** 检查当前用户是否拥有指定权限 */
  const hasPermission = (perm: AdminPermission | null) => {
    if (accessLevel === "owner") return true;
    if (!perm) return true;
    return permissions.includes(perm);
  };

  /** 可见的导航项 */
  const visibleNav = adminNav.filter((item) => hasPermission(item.permission));

  if (orgLoading || accessLevel === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  if (accessLevel === "denied") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-text-secondary">
        <ShieldX size={48} className="text-text-placeholder" />
        <p className="text-lg font-medium">无权访问管理后台</p>
        <p className="text-sm text-text-placeholder">仅企业管理员可进入</p>
        <Link href="/messages"
          className="mt-4 text-sm text-primary hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> 返回工作区
        </Link>
      </div>
    );
  }

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
      {/* 管理后台侧栏 */}
      <aside className="w-full md:w-56 max-h-48 md:max-h-none bg-panel-bg border-b md:border-b-0 md:border-r border-panel-border flex flex-col shrink-0">
        <div className="px-4 py-3 md:py-5 border-b border-panel-border">
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={18} className="text-primary" />
            <h2 className="text-sm font-bold text-text-primary">管理后台</h2>
          </div>
          <p className="text-xs text-text-placeholder truncate">{currentOrg?.name}</p>
          {accessLevel === "admin" && (
            <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
              管理员
            </span>
          )}
        </div>

        <nav className="flex-1 py-2 px-2 flex md:block gap-1 md:space-y-0.5 overflow-x-auto md:overflow-x-visible md:overflow-y-auto">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors shrink-0
                  ${active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-text-secondary hover:bg-list-hover hover:text-text-primary"
                  }`}>
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block px-2 py-3 border-t border-panel-border">
          <Link href="/messages"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-list-hover transition-colors">
            <ArrowLeft size={16} /> 返回工作区
          </Link>
        </div>
      </aside>

      <div className="flex-1 min-w-0 overflow-y-auto bg-bg-page p-4 md:p-6">
        {children}
      </div>
    </div>
  );
}
