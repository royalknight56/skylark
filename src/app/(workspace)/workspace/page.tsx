/**
 * 工作台页面 — 展示企业自建机器人及常用功能入口
 * @author skylark
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bot, MessageSquare, Users, FileText, Table2,
  Calendar, Shield, Loader2, ChevronRight, Zap,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";

/** 机器人条目（公开信息） */
interface BotItem {
  id: string;
  name: string;
  avatar_url: string | null;
  description: string | null;
  status: string;
  created_at: string;
  creator: { name: string; avatar_url: string | null };
}

/** 快捷入口 */
const QUICK_LINKS = [
  { icon: MessageSquare, label: "消息", href: "/messages", color: "text-blue-500", bg: "bg-blue-50" },
  { icon: Users, label: "通讯录", href: "/contacts", color: "text-green-500", bg: "bg-green-50" },
  { icon: FileText, label: "云文档", href: "/docs", color: "text-purple-500", bg: "bg-purple-50" },
  { icon: Table2, label: "多维表格", href: "/bases", color: "text-orange-500", bg: "bg-orange-50" },
  { icon: Calendar, label: "日历", href: "/calendar", color: "text-cyan-500", bg: "bg-cyan-50" },
  { icon: Shield, label: "管理后台", href: "/admin", color: "text-red-400", bg: "bg-red-50", ownerOnly: true },
];

export default function WorkspacePage() {
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  const router = useRouter();

  const [bots, setBots] = useState<BotItem[]>([]);
  const [loadingBots, setLoadingBots] = useState(true);

  const isOwner = currentOrg && user && currentOrg.owner_id === user.id;

  /** 加载企业机器人 */
  useEffect(() => {
    if (!currentOrg) { setLoadingBots(false); return; }
    setLoadingBots(true);
    fetch(`/api/bots?org_id=${currentOrg.id}`)
      .then((r) => r.json() as Promise<{ success: boolean; data?: BotItem[] }>)
      .then((json) => { if (json.success && json.data) setBots(json.data); })
      .catch(() => {})
      .finally(() => setLoadingBots(false));
  }, [currentOrg?.id, currentOrg]);

  /** 问候语 */
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return "夜深了";
    if (hour < 12) return "上午好";
    if (hour < 14) return "中午好";
    if (hour < 18) return "下午好";
    return "晚上好";
  };

  return (
    <div className="flex-1 bg-bg-page overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 欢迎区 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary">
            {getGreeting()}，{user?.name || "用户"}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {currentOrg ? `当前企业：${currentOrg.name}` : "欢迎使用 Skylark"}
          </p>
        </div>

        {/* 快捷入口 */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-text-primary mb-3">常用功能</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {QUICK_LINKS.filter((l) => !l.ownerOnly || isOwner).map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.href}
                  onClick={() => router.push(link.href)}
                  className="flex flex-col items-center gap-2 p-4 bg-panel-bg rounded-xl border border-panel-border
                    hover:shadow-md hover:border-primary/20 transition-all group"
                >
                  <div className={`w-10 h-10 rounded-xl ${link.bg} flex items-center justify-center
                    group-hover:scale-110 transition-transform`}>
                    <Icon size={20} className={link.color} />
                  </div>
                  <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors">
                    {link.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 企业机器人 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-text-primary">企业机器人</h2>
            </div>
            {isOwner && (
              <button
                onClick={() => router.push("/admin/bots")}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                管理 <ChevronRight size={12} />
              </button>
            )}
          </div>

          {loadingBots ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="text-primary animate-spin" />
            </div>
          ) : bots.length === 0 ? (
            <div className="bg-panel-bg rounded-xl border border-panel-border p-8 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                <Bot size={28} className="text-primary opacity-50" />
              </div>
              <p className="text-sm text-text-secondary mb-1">暂无企业机器人</p>
              <p className="text-xs text-text-placeholder">
                {isOwner
                  ? "前往管理后台创建自定义机器人"
                  : "管理员可在管理后台创建企业机器人"}
              </p>
              {isOwner && (
                <button
                  onClick={() => router.push("/admin/bots")}
                  className="mt-4 px-4 py-2 bg-primary text-white text-xs rounded-lg hover:bg-primary/90 transition-colors"
                >
                  创建机器人
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {bots.map((bot) => (
                <div
                  key={bot.id}
                  className="bg-panel-bg rounded-xl border border-panel-border p-4 hover:shadow-md hover:border-primary/20 transition-all"
                >
                  <div className="flex items-start gap-3">
                    {/* 机器人头像 */}
                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                      {bot.avatar_url ? (
                        <img src={bot.avatar_url} alt={bot.name} className="w-10 h-10 rounded-xl object-cover" />
                      ) : (
                        <Bot size={20} className="text-primary" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* 名称和状态 */}
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-text-primary truncate">{bot.name}</h3>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-green-100 text-green-700">
                          <Zap size={8} /> 运行中
                        </span>
                      </div>

                      {/* 描述 */}
                      {bot.description && (
                        <p className="text-xs text-text-secondary line-clamp-2 mb-2">{bot.description}</p>
                      )}

                      {/* 元信息 */}
                      <div className="flex items-center gap-2 text-[10px] text-text-placeholder">
                        <span>由 {bot.creator.name} 创建</span>
                        <span>·</span>
                        <span>{new Date(bot.created_at).toLocaleDateString("zh-CN")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
