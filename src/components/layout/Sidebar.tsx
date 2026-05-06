/**
 * 左侧导航栏组件
 * 深色侧边栏，包含企业切换 + 主要功能模块导航
 * @author skylark
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare,
  Mail,
  Users,
  FileText,
  Settings,
  LayoutGrid,
  ChevronDown,
  Plus,
  Check,
  Loader2,
  Shield,
  Calendar,
} from "lucide-react";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useNotification } from "@/lib/notification-context";
import ProfilePopup from "@/components/profile/ProfilePopup";

/** 导航项配置 */
const navItems = [
  { icon: MessageSquare, label: "消息", href: "/messages" },
  { icon: Mail, label: "邮箱", href: "/mail" },
  { icon: Calendar, label: "日历", href: "/calendar" },
  { icon: Users, label: "通讯录", href: "/contacts" },
  { icon: FileText, label: "云文档", href: "/docs", matchPrefixes: ["/docs", "/bases"] },
  { icon: LayoutGrid, label: "工作台", href: "/workspace" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentOrg, orgs, loading, switchOrg } = useOrg();
  const { user } = useAuth();
  const { totalUnread } = useNotification();
  const [showOrgMenu, setShowOrgMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  /** 关闭菜单的外部点击 */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowOrgMenu(false);
      }
    };
    if (showOrgMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showOrgMenu]);

  const isActive = (href: string, matchPrefixes?: string[]) => {
    if (matchPrefixes) return matchPrefixes.some((p) => pathname.startsWith(p));
    if (href === "/messages") return pathname.startsWith("/messages");
    return pathname.startsWith(href);
  };

  /** 切换企业 */
  const handleSwitchOrg = (org: typeof currentOrg) => {
    if (!org) return;
    switchOrg(org);
    setShowOrgMenu(false);
  };

  /** 企业名取首字 */
  const getOrgInitial = (name: string) => name.charAt(0);

  return (
    <aside className="
      mobile-tabbar w-full bg-sidebar-bg flex flex-row items-center justify-around px-2 shrink-0 border-t border-white/10
      md:w-16 md:h-screen md:flex-col md:items-center md:justify-start md:py-4 md:px-0 md:border-t-0
    ">
      {/* 企业切换按钮 — 移动端隐藏 */}
      <div className="relative hidden md:block" ref={menuRef}>
        {loading || !currentOrg ? (
          <div className="w-9 h-9 rounded-lg bg-primary/50 flex items-center justify-center mb-1">
            <Loader2 size={16} className="text-white animate-spin" />
          </div>
        ) : (
          <button
            onClick={() => setShowOrgMenu(!showOrgMenu)}
            className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center mb-1 relative group
              hover:ring-2 hover:ring-primary/40 transition-all"
            title={currentOrg.name}
          >
            <span className="text-white font-bold text-sm">
              {getOrgInitial(currentOrg.name)}
            </span>
            <ChevronDown
              size={10}
              className="absolute -bottom-0.5 -right-0.5 text-white bg-primary rounded-full"
            />
          </button>
        )}

        {/* 企业切换下拉菜单 */}
        {showOrgMenu && currentOrg && (
          <div className="absolute left-12 top-0 w-64 bg-panel-bg rounded-xl shadow-lg border border-panel-border z-50 overflow-hidden">
            {/* 当前企业 */}
            <div className="p-3 border-b border-panel-border">
              <p className="text-xs text-text-placeholder mb-1">当前企业</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-xs">
                    {getOrgInitial(currentOrg.name)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {currentOrg.name}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {currentOrg.member_count} 名成员
                  </p>
                </div>
              </div>
            </div>

            {/* 企业列表 */}
            <div className="py-1">
              <p className="px-3 py-1.5 text-xs text-text-placeholder">切换企业</p>
              {orgs.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSwitchOrg(org)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-list-hover transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold text-xs">
                      {getOrgInitial(org.name)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{org.name}</p>
                    <p className="text-xs text-text-placeholder">
                      {org.member_count} 名成员
                    </p>
                  </div>
                  {org.id === currentOrg.id && (
                    <Check size={16} className="text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* 底部操作 */}
            <div className="border-t border-panel-border py-1">
              <button
                onClick={() => { setShowOrgMenu(false); router.push("/org"); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-list-hover transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-md bg-list-hover flex items-center justify-center shrink-0">
                  <Plus size={14} className="text-text-secondary" />
                </div>
                <span className="text-sm text-text-secondary">创建或加入企业</span>
              </button>
              <Link
                href="/org/settings"
                onClick={() => setShowOrgMenu(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-list-hover transition-colors"
              >
                <div className="w-7 h-7 rounded-md bg-list-hover flex items-center justify-center shrink-0">
                  <Settings size={14} className="text-text-secondary" />
                </div>
                <span className="text-sm text-text-secondary">企业设置</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 主导航 — 移动端水平排列，桌面端垂直排列 */}
      <nav className="flex flex-row items-center gap-1 md:flex-1 md:flex-col md:items-center md:gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, (item as { matchPrefixes?: string[] }).matchPrefixes);
          const showBadge = item.href === "/messages" && totalUnread > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center transition-colors relative group
                ${active
                  ? "bg-sidebar-active text-sidebar-text-active"
                  : "text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active"
                }`}
              title={item.label}
            >
              <Icon size={20} />
              {/* 移动端显示文字标签 */}
              <span className="text-[9px] leading-tight mt-0.5 md:hidden">{item.label}</span>
              {/* 未读消息角标 */}
              {showBadge && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center leading-none">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
              {/* 桌面端 hover 提示 */}
              <span
                className="absolute left-14 px-2 py-1 bg-gray-800 text-white text-xs rounded
                  opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 hidden md:block"
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* 底部设置 — 移动端仅显示设置和头像 */}
      <div className="flex flex-row items-center gap-2 md:flex-col md:items-center md:gap-2">
        {/* 管理后台入口 - 仅 owner 且桌面端可见 */}
        {currentOrg && user && currentOrg.owner_id === user.id && (
          <Link
            href="/admin"
            className={`w-10 h-10 rounded-lg hidden md:flex items-center justify-center transition-colors relative group
              ${pathname.startsWith("/admin")
                ? "bg-sidebar-active text-sidebar-text-active"
                : "text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active"
              }`}
            title="管理后台"
          >
            <Shield size={20} />
            <span
              className="absolute left-14 px-2 py-1 bg-gray-800 text-white text-xs rounded
                opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50"
            >
              管理后台
            </span>
          </Link>
        )}
        <Link
          href="/settings"
          className={`w-10 h-10 rounded-lg hidden md:flex items-center justify-center transition-colors relative group
            ${pathname.startsWith("/settings")
              ? "bg-sidebar-active text-sidebar-text-active"
              : "text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active"
            }`}
          title="设置"
        >
          <Settings size={20} />
          <span
            className="absolute left-14 px-2 py-1 bg-gray-800 text-white text-xs rounded
              opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50"
          >
            设置
          </span>
        </Link>
        <button
          onClick={() => setShowProfile(true)}
          className="relative w-8 h-8 rounded-full avatar-placeholder avatar-blue text-xs cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
          title={user?.name}
        >
          {user?.name?.charAt(0) || "?"}
          {/* 状态指示点 */}
          {user && (
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-sidebar-bg
                ${user.status === "online" ? "bg-green-400"
                  : user.status === "busy" ? "bg-red-400"
                  : user.status === "away" ? "bg-yellow-400"
                  : "bg-gray-400"
                }`}
            />
          )}
        </button>
      </div>

      {/* 个人名片弹窗 */}
      {showProfile && <ProfilePopup onClose={() => setShowProfile(false)} />}
    </aside>
  );
}
