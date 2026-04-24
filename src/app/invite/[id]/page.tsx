/**
 * 邀请接受页面
 * 用户通过邀请链接打开，查看企业信息并接受邀请
 * @author skylark
 */

"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Building2, Users, Check, X,
  Clock, AlertCircle, ArrowRight,
} from "lucide-react";
import type { Organization } from "@/lib/types";

interface InviteData {
  id: string;
  org: Organization;
  invitee_email: string | null;
  expires_at: string | null;
  created_at: string;
}

export default function InviteAcceptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [error, setError] = useState("");
  const [errorStatus, setErrorStatus] = useState<"expired" | "accepted" | null>(null);
  const [errorOrg, setErrorOrg] = useState<Organization | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);

  /** 加载邀请详情 */
  useEffect(() => {
    fetch(`/api/invite/${id}`)
      .then((res) => res.json() as Promise<{
        success: boolean; data?: InviteData;
        error?: string;
      }>)
      .then((json) => {
        if (json.success && json.data) {
          setInvite(json.data);
        } else {
          setError(json.error || "邀请无效");
          // 尝试从错误响应获取组织信息和状态
          const errData = json as unknown as { data?: { status?: string; org?: Organization } };
          if (errData.data?.status) setErrorStatus(errData.data.status as "expired" | "accepted");
          if (errData.data?.org) setErrorOrg(errData.data.org);
        }
      })
      .catch(() => setError("加载失败"))
      .finally(() => setLoading(false));
  }, [id]);

  /** 接受邀请 */
  const handleAccept = async () => {
    setAccepting(true);
    setError("");
    try {
      const res = await fetch(`/api/invite/${id}`, { method: "POST" });
      const json = (await res.json()) as {
        success: boolean;
        data?: { org?: Organization; joined?: boolean; already_member?: boolean };
        error?: string;
      };

      if (!res.ok && res.status === 401) {
        // 未登录，跳转登录页
        router.push("/login");
        return;
      }

      if (json.success && json.data) {
        if (json.data.already_member) {
          setAlreadyMember(true);
        } else {
          setAccepted(true);
        }
      } else {
        setError(json.error || "加入失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setAccepting(false);
    }
  };

  /** 进入工作区 */
  const goToWorkspace = () => {
    router.push("/workspace");
  };

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-page">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  // 邀请已过期或已被接受
  if (error && (errorStatus || !invite)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-page p-4">
        <div className="w-full max-w-sm bg-panel-bg rounded-2xl shadow-lg border border-panel-border p-8 text-center">
          {errorStatus === "expired" ? (
            <Clock size={48} className="mx-auto mb-4 text-yellow-500" />
          ) : errorStatus === "accepted" ? (
            <Check size={48} className="mx-auto mb-4 text-green-500" />
          ) : (
            <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
          )}

          <h1 className="text-lg font-bold text-text-primary mb-2">
            {errorStatus === "expired" ? "邀请已过期" : errorStatus === "accepted" ? "邀请已被接受" : "邀请无效"}
          </h1>
          <p className="text-sm text-text-secondary mb-4">{error}</p>

          {errorOrg && (
            <div className="p-3 bg-bg-page rounded-lg mb-4">
              <p className="text-sm font-medium text-text-primary">{errorOrg.name}</p>
              {errorOrg.description && <p className="text-xs text-text-secondary mt-1">{errorOrg.description}</p>}
            </div>
          )}

          <button onClick={() => router.push("/org")}
            className="w-full h-10 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
            返回首页
          </button>
        </div>
      </div>
    );
  }

  // 已成功加入
  if (accepted || alreadyMember) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-page p-4">
        <div className="w-full max-w-sm bg-panel-bg rounded-2xl shadow-lg border border-panel-border p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-green-600" />
          </div>
          <h1 className="text-lg font-bold text-text-primary mb-2">
            {alreadyMember ? "你已是该企业成员" : "成功加入！"}
          </h1>
          <p className="text-sm text-text-secondary mb-6">
            {alreadyMember
              ? `你已经是 ${invite?.org?.name || "该企业"} 的成员了`
              : `欢迎加入 ${invite?.org?.name || "企业"}`}
          </p>
          <button onClick={goToWorkspace}
            className="w-full h-10 rounded-lg bg-primary text-white text-sm font-medium
              hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
            进入工作区 <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // 邀请详情
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page p-4">
      <div className="w-full max-w-sm bg-panel-bg rounded-2xl shadow-lg border border-panel-border overflow-hidden">
        {/* 顶部 */}
        <div className="bg-linear-to-br from-primary/10 to-primary/5 px-8 pt-8 pb-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Building2 size={32} className="text-primary" />
          </div>
          <h1 className="text-xl font-bold text-text-primary">{invite?.org?.name}</h1>
          {invite?.org?.description && (
            <p className="text-sm text-text-secondary mt-2">{invite.org.description}</p>
          )}
          {invite?.org?.member_count !== undefined && (
            <div className="flex items-center justify-center gap-1 mt-3 text-xs text-text-secondary">
              <Users size={12} /> {invite.org.member_count} 名成员
            </div>
          )}
        </div>

        {/* 邀请信息 */}
        <div className="px-8 py-6">
          <p className="text-sm text-text-secondary text-center mb-2">
            你被邀请加入此企业
          </p>

          {invite?.invitee_email && (
            <p className="text-xs text-text-placeholder text-center mb-4">
              邀请发送至：{invite.invitee_email}
            </p>
          )}

          {invite?.expires_at && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-text-placeholder mb-6">
              <Clock size={11} />
              有效期至 {new Date(invite.expires_at).toLocaleDateString("zh-CN", {
                year: "numeric", month: "long", day: "numeric",
              })}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 mb-4">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button onClick={handleAccept} disabled={accepting}
            className="w-full h-11 rounded-lg bg-primary text-white text-sm font-semibold
              hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {accepting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            接受邀请并加入
          </button>

          <button onClick={() => router.push("/org")}
            className="w-full h-9 mt-2 rounded-lg text-sm text-text-secondary hover:bg-list-hover transition-colors">
            暂不加入
          </button>
        </div>
      </div>
    </div>
  );
}
