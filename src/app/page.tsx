/**
 * 根页面 - 客户端重定向
 * 已登录 → /messages，未登录 → /login
 * @author skylark
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/messages" : "/login");
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page">
      <Loader2 size={32} className="text-primary animate-spin" />
    </div>
  );
}
