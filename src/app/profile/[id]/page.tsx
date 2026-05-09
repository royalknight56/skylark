/**
 * 个人名片分享页
 * 可通过链接访问，展示用户公开名片信息
 * @author skylark
 */

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Mail, Briefcase, Building2, Loader2,
  MessageSquare, ArrowLeft,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import type { User } from "@/lib/types";

interface ProfileData {
  user: Partial<User>;
  orgInfo: { org_name: string; title: string | null; department: string | null } | null;
}

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      window.localStorage.setItem("skylark_referral_user_id", ref);
    }
    fetch(`/api/users/profile?id=${id}`)
      .then((r) => r.json())
      .then((json: unknown) => {
        const result = json as { success: boolean; data?: ProfileData; error?: string };
        if (result.success && result.data) {
          setData(result.data);
        } else {
          setError(result.error || "用户不存在");
        }
      })
      .catch(() => setError("加载失败"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-page flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-bg-page flex flex-col items-center justify-center gap-4">
        <p className="text-lg text-text-secondary">{error || "用户不存在"}</p>
        <button
          onClick={() => router.push("/messages")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 transition-colors"
        >
          <ArrowLeft size={16} /> 返回消息
        </button>
      </div>
    );
  }

  const { user, orgInfo } = data;

  const statusDot: Record<string, string> = {
    online: "bg-green-400", busy: "bg-red-400", away: "bg-yellow-400", offline: "bg-gray-400",
  };

  const statusLabel: Record<string, string> = {
    online: "在线", busy: "忙碌", away: "离开", offline: "离线",
  };

  return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-panel-bg rounded-2xl shadow-lg overflow-hidden">
        {/* 渐变顶部 */}
        <div className="h-28 bg-linear-to-br from-primary via-blue-400 to-cyan-300" />

        <div className="px-6 pb-6 -mt-12">
          {/* 头像 */}
          <div className="relative inline-block">
            <Avatar
              name={user.name || "?"}
              avatarUrl={user.avatar_url}
              size="lg"
              className="w-24! h-24! text-3xl! border-4 border-panel-bg shadow-md"
            />
            <span
              className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-[3px] border-panel-bg ${statusDot[user.status || "offline"]}`}
            />
          </div>

          {/* 名字 + 状态 */}
          <div className="mt-3">
            <h2 className="text-2xl font-bold text-text-primary">{user.name}</h2>
            {(user.status_emoji || user.status_text) && (
              <p className="text-sm text-text-secondary mt-1">
                {user.status_emoji && <span className="mr-1">{user.status_emoji}</span>}
                {user.status_text}
              </p>
            )}
            {!(user.status_emoji || user.status_text) && (
              <p className="text-sm text-text-placeholder mt-1">
                {statusLabel[user.status || "offline"]}
              </p>
            )}
          </div>

          {/* 签名 */}
          {user.signature && (
            <p className="mt-3 text-sm text-text-secondary italic bg-list-hover rounded-lg px-3 py-2">
              &ldquo;{user.signature}&rdquo;
            </p>
          )}

          {/* 企业信息 */}
          {orgInfo && (
            <div className="mt-4 space-y-2">
              {orgInfo.title && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Briefcase size={14} className="text-text-placeholder" />
                  <span>{orgInfo.title}</span>
                </div>
              )}
              {orgInfo.department && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Building2 size={14} className="text-text-placeholder" />
                  <span>{orgInfo.department}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Building2 size={14} className="text-text-placeholder" />
                <span>{orgInfo.org_name}</span>
              </div>
            </div>
          )}

          {/* 联系方式 */}
          <div className="mt-4 pt-3 border-t border-panel-border space-y-2">
            {user.email && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Mail size={14} className="text-text-placeholder" />
                <span>{user.email}</span>
              </div>
            )}
          </div>

          {/* 操作 */}
          <div className="mt-5">
            <button
              onClick={() => router.push(`/login?ref=${encodeURIComponent(id)}`)}
              className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <MessageSquare size={16} /> 注册 / 登录 Skylark
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
