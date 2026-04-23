/**
 * 企业上下文 - 全局共享当前企业状态
 * 初始化时从 API 拉取企业列表，Sidebar 切换时更新
 * @author skylark
 */

"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Organization } from "./types";

interface OrgContextValue {
  /** 当前选中的企业（加载中时为 null） */
  currentOrg: Organization | null;
  /** 用户所属的企业列表 */
  orgs: Organization[];
  /** 是否正在加载企业列表 */
  loading: boolean;
  /** 切换企业 */
  switchOrg: (org: Organization) => void;
  /** 新增企业到列表（创建/加入后调用） */
  addOrg: (org: Organization) => void;
  /** 重新拉取企业列表 */
  refreshOrgs: () => Promise<void>;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: ReactNode }) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  /** 从 API 拉取企业列表 */
  const refreshOrgs = useCallback(async () => {
    try {
      const res = await fetch("/api/orgs");
      const json = (await res.json()) as { success: boolean; data?: Organization[] };
      if (json.success && json.data) {
        setOrgs(json.data);
        setCurrentOrg((prev) => {
          if (prev && json.data!.some((o) => o.id === prev.id)) return prev;
          return json.data![0] ?? null;
        });
      }
    } catch {
      // 网络异常
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshOrgs();
  }, [refreshOrgs]);

  /** 切换企业 */
  const switchOrg = useCallback(async (org: Organization) => {
    setCurrentOrg(org);
    try {
      await fetch("/api/orgs/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: org.id }),
      });
    } catch {
      // 离线模式
    }
  }, []);

  /** 新增企业到本地列表 */
  const addOrg = useCallback((org: Organization) => {
    setOrgs((prev) => {
      if (prev.some((o) => o.id === org.id)) return prev;
      return [...prev, org];
    });
    setCurrentOrg(org);
  }, []);

  return (
    <OrgContext.Provider value={{ currentOrg, orgs, loading, switchOrg, addOrg, refreshOrgs }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
