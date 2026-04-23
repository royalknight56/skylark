/**
 * 企业设置页面
 * 展示企业信息、成员管理、邀请码
 * @author skylark
 */

"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  Users,
  Copy,
  Check,
  Shield,
  Crown,
  Loader2,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useOrg } from "@/lib/org-context";
import type { OrgMember, User } from "@/lib/types";

const roleIcon: Record<string, React.ElementType> = {
  owner: Crown,
  admin: Shield,
  member: Users,
};

const roleLabel: Record<string, string> = {
  owner: "拥有者",
  admin: "管理员",
  member: "成员",
};

const roleColor: Record<string, string> = {
  owner: "text-warning",
  admin: "text-primary",
  member: "text-text-secondary",
};

export default function OrgSettingsPage() {
  const { currentOrg } = useOrg();
  const [copied, setCopied] = useState(false);
  const [members, setMembers] = useState<(OrgMember & { user: User })[]>([]);
  const [loading, setLoading] = useState(true);

  /** 从 API 拉取成员列表 */
  useEffect(() => {
    if (!currentOrg) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/orgs/${currentOrg.id}/members`)
      .then((res) => res.json() as Promise<{ success: boolean; data?: (OrgMember & { user: User })[] }>)
      .then((json) => {
        if (json.success && json.data) setMembers(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentOrg?.id, currentOrg]);

  /** 复制邀请码 */
  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentOrg?.invite_code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!currentOrg) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-page">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-bg-page">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* 企业信息 */}
        <div className="bg-panel-bg rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Building2 size={20} className="text-primary" />
            企业信息
          </h2>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-2xl">{currentOrg.name.charAt(0)}</span>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-text-primary">{currentOrg.name}</h3>
              <p className="text-sm text-text-secondary mt-1">{currentOrg.description}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-text-secondary">
                <span className="flex items-center gap-1">
                  <Users size={14} />
                  {currentOrg.member_count} 名成员
                </span>
                <span>创建于 {new Date(currentOrg.created_at).toLocaleDateString("zh-CN")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 邀请码 */}
        <div className="bg-panel-bg rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">邀请码</h2>
          <p className="text-sm text-text-secondary mb-3">
            分享邀请码给同事，他们可以通过邀请码加入企业
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-12 px-4 rounded-lg bg-bg-page border border-panel-border
              flex items-center justify-center text-2xl font-mono font-bold text-primary tracking-[0.3em]">
              {currentOrg.invite_code}
            </div>
            <button
              onClick={handleCopyCode}
              className={`h-12 px-4 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors
                ${copied
                  ? "bg-green-50 text-success border border-green-200"
                  : "bg-primary text-white hover:bg-primary-hover"
                }`}
            >
              {copied ? (
                <>
                  <Check size={16} />
                  已复制
                </>
              ) : (
                <>
                  <Copy size={16} />
                  复制
                </>
              )}
            </button>
          </div>
        </div>

        {/* 成员管理 */}
        <div className="bg-panel-bg rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Users size={20} className="text-primary" />
              成员管理
              <span className="text-sm font-normal text-text-secondary">
                ({members.length})
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="py-8 flex items-center justify-center">
              <Loader2 size={24} className="text-primary animate-spin" />
            </div>
          ) : (
            <div className="space-y-1">
              {members.map((member) => {
                const RoleIcon = roleIcon[member.role] || Users;
                return (
                  <div
                    key={member.user_id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-list-hover transition-colors"
                  >
                    <Avatar
                      name={member.user?.name || ""}
                      avatarUrl={member.user?.avatar_url}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary">
                          {member.user?.name}
                        </span>
                        <span className={`flex items-center gap-0.5 text-xs ${roleColor[member.role]}`}>
                          <RoleIcon size={12} />
                          {roleLabel[member.role]}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {member.department && `${member.department}`}
                        {member.department && member.title && " · "}
                        {member.title && `${member.title}`}
                      </p>
                    </div>
                    <span className="text-xs text-text-placeholder">{member.user?.email}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
