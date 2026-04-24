/**
 * 联系人详情卡片组件
 * 展示联系人的详细信息：部门、职位、手机、邮箱、工号、城市等
 * @author skylark
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare, Phone, Video, Mail, Loader2,
  Building2, Briefcase, MapPin, Hash, UserCheck,
  Smartphone, Shield, CalendarDays,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useOrg } from "@/lib/org-context";
import type { User, OrgMember } from "@/lib/types";

interface ContactCardProps {
  user: User;
}

const statusLabel: Record<string, string> = {
  online: "在线",
  offline: "离线",
  busy: "忙碌",
  away: "离开",
};

const statusDot: Record<string, string> = {
  online: "bg-success",
  offline: "bg-gray-300",
  busy: "bg-danger",
  away: "bg-warning",
};

const roleLabel: Record<string, string> = {
  owner: "企业所有者",
  admin: "管理员",
  member: "成员",
};

const genderLabel: Record<string, string> = {
  male: "男",
  female: "女",
};

export default function ContactCard({ user }: ContactCardProps) {
  const router = useRouter();
  const { currentOrg } = useOrg();
  const [sending, setSending] = useState(false);
  const [memberInfo, setMemberInfo] = useState<(OrgMember & { user: User }) | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);

  /* 加载企业成员详细信息 */
  useEffect(() => {
    if (!currentOrg) return;
    setLoadingInfo(true);
    setMemberInfo(null);

    fetch(`/api/orgs/${currentOrg.id}/members`)
      .then((res) => res.json())
      .then((json) => {
        const result = json as { success: boolean; data?: (OrgMember & { user: User })[] };
        if (result.success && result.data) {
          const found = result.data.find((m) => m.user_id === user.id);
          if (found) setMemberInfo(found);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingInfo(false));
  }, [currentOrg, user.id]);

  /** 查找或创建私聊会话并跳转 */
  const handleSendMessage = async () => {
    if (!currentOrg || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/conversations/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: currentOrg.id, target_user_id: user.id }),
      });
      const json = (await res.json()) as { success: boolean; data?: { id: string } };
      if (json.success && json.data) {
        router.push(`/messages/${json.data.id}`);
      }
    } finally {
      setSending(false);
    }
  };

  /** 信息行组件 */
  const InfoRow = ({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-2">
        <Icon size={15} className="text-text-placeholder mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] text-text-placeholder leading-none mb-0.5">{label}</p>
          <p className="text-sm text-text-primary break-all">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex items-start justify-center bg-bg-page p-8 overflow-y-auto">
      <div className="w-full max-w-md bg-panel-bg rounded-xl shadow-sm overflow-hidden">
        {/* 头部背景 + 头像 */}
        <div className="h-28 bg-linear-to-br from-primary via-blue-400 to-cyan-300 relative">
          {/* 状态标签 */}
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs text-white">
              <span className={`w-2 h-2 rounded-full ${statusDot[user.status] || "bg-gray-300"}`} />
              {statusLabel[user.status] || "离线"}
            </span>
          </div>
        </div>

        <div className="px-6 pb-6 -mt-12">
          {/* 头像 */}
          <div className="relative inline-block">
            <Avatar name={user.name} avatarUrl={user.avatar_url} size="lg" className="w-24! h-24! text-3xl! border-4 border-panel-bg shadow-md" />
            <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-[3px] border-panel-bg ${statusDot[user.status] || "bg-gray-300"}`} />
          </div>

          {/* 名称 + 角色 */}
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-text-primary">{user.name}</h3>
              {memberInfo && (
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium
                  ${memberInfo.role === "owner" ? "bg-primary/10 text-primary" :
                    memberInfo.role === "admin" ? "bg-orange-50 text-orange-600" :
                    "bg-gray-100 text-text-secondary"}`}
                >
                  {roleLabel[memberInfo.role] || "成员"}
                </span>
              )}
            </div>
            {/* 个人状态文本 */}
            {(user.status_emoji || user.status_text) && (
              <p className="text-sm text-text-secondary mt-0.5">
                {user.status_emoji && <span className="mr-1">{user.status_emoji}</span>}
                {user.status_text}
              </p>
            )}
            {/* 个性签名 */}
            {user.signature && (
              <p className="text-sm text-text-placeholder italic mt-1">&ldquo;{user.signature}&rdquo;</p>
            )}
            {/* 职位 + 部门（简要） */}
            {memberInfo && (memberInfo.title || memberInfo.department) && (
              <p className="text-sm text-text-secondary mt-1">
                {memberInfo.title}
                {memberInfo.title && memberInfo.department && " · "}
                {memberInfo.department}
              </p>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="mt-5 flex items-center gap-2">
            <button
              onClick={handleSendMessage}
              disabled={sending}
              className="flex-1 h-10 rounded-lg bg-primary text-white text-sm font-medium
                flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-70"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
              发消息
            </button>
            <button className="w-10 h-10 rounded-lg border border-panel-border flex items-center justify-center text-text-secondary hover:bg-list-hover transition-colors">
              <Phone size={16} />
            </button>
            <button className="w-10 h-10 rounded-lg border border-panel-border flex items-center justify-center text-text-secondary hover:bg-list-hover transition-colors">
              <Video size={16} />
            </button>
          </div>

          {/* 详细信息分割线 */}
          <div className="mt-5 border-t border-panel-border" />

          {/* 详细信息区 */}
          {loadingInfo ? (
            <div className="flex justify-center py-6">
              <Loader2 size={18} className="text-primary animate-spin" />
            </div>
          ) : (
            <div className="mt-3 space-y-0.5">
              {/* 联系方式 */}
              <p className="text-[11px] font-semibold text-text-placeholder uppercase tracking-wider pt-2 pb-1">联系方式</p>
              <InfoRow icon={Mail} label="邮箱" value={user.email} />
              <InfoRow icon={Smartphone} label="手机号" value={memberInfo?.phone || (user as User & { login_phone?: string }).login_phone} />

              {/* 企业信息 */}
              {memberInfo && (
                <>
                  <div className="border-t border-panel-border my-2" />
                  <p className="text-[11px] font-semibold text-text-placeholder uppercase tracking-wider pt-2 pb-1">企业信息</p>
                  <InfoRow icon={Briefcase} label="职位" value={memberInfo.title} />
                  <InfoRow icon={Building2} label="部门" value={memberInfo.department} />
                  <InfoRow icon={Hash} label="工号" value={memberInfo.employee_id} />
                  <InfoRow icon={UserCheck} label="人员类型" value={memberInfo.employee_type} />
                  <InfoRow icon={MapPin} label="工作城市" value={memberInfo.work_city} />
                  <InfoRow icon={Shield} label="性别" value={memberInfo.gender ? genderLabel[memberInfo.gender] || memberInfo.gender : null} />
                  <InfoRow icon={CalendarDays} label="入职时间" value={memberInfo.joined_at ? new Date(memberInfo.joined_at).toLocaleDateString("zh-CN") : null} />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
