/**
 * 管理后台 - 机器人管理
 * 支持创建、编辑、删除机器人，查看 API 文档，管理 webhook
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bot,
  Plus,
  Trash2,
  Settings,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Check,
  X,
  Globe,
  Loader2,
  ChevronDown,
  ChevronUp,
  Power,
  PowerOff,
} from "lucide-react";
import { useOrg } from "@/lib/org-context";
import type { Bot as BotType } from "@/lib/types";

export default function AdminBotsPage() {
  const { currentOrg } = useOrg();
  const [bots, setBots] = useState<BotType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedBot, setExpandedBot] = useState<string | null>(null);

  const fetchBots = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const res = await fetch(`/api/admin/bots?org_id=${currentOrg.id}`);
      const json = (await res.json()) as { success: boolean; data?: BotType[] };
      if (json.success && json.data) setBots(json.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [currentOrg]);

  useEffect(() => {
    fetchBots();
  }, [fetchBots]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Bot size={22} className="text-primary" />
            机器人管理
          </h1>
          <p className="text-sm text-text-placeholder mt-1">
            创建企业自建机器人，支持通过 API 发送和接收消息
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          创建机器人
        </button>
      </div>

      {/* 创建表单 */}
      {showCreate && (
        <CreateBotForm
          orgId={currentOrg!.id}
          onCreated={() => {
            setShowCreate(false);
            fetchBots();
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* 机器人列表 */}
      {bots.length === 0 && !showCreate ? (
        <div className="text-center py-20 text-text-placeholder">
          <Bot size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-base">暂无机器人</p>
          <p className="text-sm mt-1">点击右上角创建你的第一个机器人</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bots.map((bot) => (
            <BotCard
              key={bot.id}
              bot={bot}
              expanded={expandedBot === bot.id}
              onToggle={() =>
                setExpandedBot(expandedBot === bot.id ? null : bot.id)
              }
              orgId={currentOrg!.id}
              onUpdated={fetchBots}
            />
          ))}
        </div>
      )}

      {/* API 文档 */}
      <div className="mt-10 p-5 bg-panel-bg border border-panel-border rounded-xl">
        <h3 className="text-sm font-bold text-text-primary mb-3">
          📖 Bot API 文档
        </h3>
        <div className="space-y-4 text-sm text-text-secondary">
          <ApiDoc
            method="POST"
            path="/api/bot/messages"
            description="发送消息到指定会话"
            body={`{
  "conversation_id": "conv-xxx",
  "content": "Hello from bot!",
  "type": "text"
}`}
          />
          <ApiDoc
            method="GET"
            path="/api/bot/messages?conversation_id=xxx&limit=50"
            description="拉取会话历史消息"
          />
          <ApiDoc
            method="POST"
            path="/api/bot/subscribe"
            description="订阅会话消息（接收 webhook 回调）"
            body={`{
  "conversation_id": "conv-xxx"
}`}
          />
          <ApiDoc
            method="DELETE"
            path="/api/bot/subscribe?conversation_id=xxx"
            description="取消订阅会话"
          />
          <div className="mt-3 p-3 bg-bg-page rounded-lg text-xs text-text-placeholder">
            <p className="font-medium text-text-secondary mb-1">🔑 鉴权方式</p>
            <p>
              所有请求需携带 Header：
              <code className="bg-panel-border px-1.5 py-0.5 rounded ml-1">
                Authorization: Bearer {"<api_token>"}
              </code>
            </p>
            <p className="mt-2 font-medium text-text-secondary mb-1">📩 Webhook 回调</p>
            <p>
              当订阅的会话有新消息时，将 POST 到机器人配置的 Webhook URL，Header 含{" "}
              <code className="bg-panel-border px-1.5 py-0.5 rounded">
                X-Bot-Secret
              </code>{" "}
              用于验证身份。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==================== 子组件 ==================== */

/** API 文档项 */
function ApiDoc({
  method,
  path,
  description,
  body,
}: {
  method: string;
  path: string;
  description: string;
  body?: string;
}) {
  const methodColor =
    method === "GET"
      ? "bg-green-100 text-green-700"
      : method === "POST"
        ? "bg-blue-100 text-blue-700"
        : method === "DELETE"
          ? "bg-red-100 text-red-700"
          : "bg-gray-100 text-gray-700";

  return (
    <div className="p-3 bg-bg-page rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded ${methodColor}`}
        >
          {method}
        </span>
        <code className="text-xs text-text-primary">{path}</code>
      </div>
      <p className="text-xs text-text-placeholder">{description}</p>
      {body && (
        <pre className="mt-2 text-xs bg-panel-bg p-2 rounded overflow-x-auto">
          {body}
        </pre>
      )}
    </div>
  );
}

/** 创建机器人表单 */
function CreateBotForm({
  orgId,
  onCreated,
  onCancel,
}: {
  orgId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: orgId,
          name: name.trim(),
          description: description.trim() || undefined,
          webhook_url: webhookUrl.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { success: boolean };
      if (json.success) onCreated();
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mb-6 p-5 bg-panel-bg border border-panel-border rounded-xl">
      <h3 className="text-sm font-bold text-text-primary mb-4">创建机器人</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-text-secondary mb-1">
            名称 <span className="text-red-500">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-bg-page border border-panel-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
            placeholder="如：通知机器人、GitHub Bot"
          />
        </div>
        <div>
          <label className="block text-xs text-text-secondary mb-1">描述</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-bg-page border border-panel-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
            placeholder="机器人功能描述"
          />
        </div>
        <div>
          <label className="block text-xs text-text-secondary mb-1">
            Webhook URL（可选，接收消息回调）
          </label>
          <input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="w-full px-3 py-2 bg-bg-page border border-panel-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
            placeholder="https://your-server.com/webhook"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-text-secondary hover:bg-list-hover rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || submitting}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            创建
          </button>
        </div>
      </div>
    </div>
  );
}

/** 机器人卡片 */
function BotCard({
  bot,
  expanded,
  onToggle,
  orgId,
  onUpdated,
}: {
  bot: BotType;
  expanded: boolean;
  onToggle: () => void;
  orgId: string;
  onUpdated: () => void;
}) {
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(bot.name);
  const [editDesc, setEditDesc] = useState(bot.description || "");
  const [editWebhook, setEditWebhook] = useState(bot.webhook_url || "");
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  const copyToken = () => {
    navigator.clipboard.writeText(newToken || bot.api_token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/bots", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: orgId,
          bot_id: bot.id,
          name: editName.trim(),
          description: editDesc.trim() || undefined,
          webhook_url: editWebhook.trim() || undefined,
        }),
      });
      setEditing(false);
      onUpdated();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/bots", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: orgId,
          bot_id: bot.id,
          status: bot.status === "active" ? "disabled" : "active",
        }),
      });
      onUpdated();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateToken = async () => {
    if (!confirm("重新生成后旧 token 将立即失效，确定继续？")) return;
    setRegenerating(true);
    try {
      const res = await fetch("/api/admin/bots", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: orgId,
          bot_id: bot.id,
          action: "regenerate_token",
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { api_token: string };
      };
      if (json.success && json.data) {
        setNewToken(json.data.api_token);
        setShowToken(true);
      }
    } catch {
      /* ignore */
    } finally {
      setRegenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`确定删除机器人「${bot.name}」？此操作不可撤销。`)) return;
    setDeleting(true);
    try {
      await fetch(
        `/api/admin/bots?org_id=${orgId}&bot_id=${bot.id}`,
        { method: "DELETE" }
      );
      onUpdated();
    } catch {
      /* ignore */
    } finally {
      setDeleting(false);
    }
  };

  const displayToken = newToken || bot.api_token;

  return (
    <div className="bg-panel-bg border border-panel-border rounded-xl overflow-hidden">
      {/* 卡片头部 */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-list-hover transition-colors"
        onClick={onToggle}
      >
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Bot size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary truncate">
              {bot.name}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                bot.status === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {bot.status === "active" ? "运行中" : "已禁用"}
            </span>
          </div>
          <p className="text-xs text-text-placeholder truncate mt-0.5">
            {bot.description || "暂无描述"}
            {bot.subscription_count
              ? ` · 订阅 ${bot.subscription_count} 个会话`
              : ""}
          </p>
        </div>
        <div className="shrink-0 text-text-placeholder">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* 展开详情 */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-panel-border pt-4 space-y-4">
          {/* API Token */}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5 font-medium">
              API Token
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-bg-page border border-panel-border rounded-lg text-xs text-text-primary font-mono truncate">
                {showToken ? displayToken : "sk-bot-••••••••••••••••••••••••"}
              </code>
              <button
                onClick={() => setShowToken(!showToken)}
                className="p-2 text-text-placeholder hover:text-text-primary transition-colors"
                title={showToken ? "隐藏" : "显示"}
              >
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                onClick={copyToken}
                className="p-2 text-text-placeholder hover:text-text-primary transition-colors"
                title="复制"
              >
                {copied ? (
                  <Check size={14} className="text-green-500" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
              <button
                onClick={handleRegenerateToken}
                disabled={regenerating}
                className="p-2 text-text-placeholder hover:text-orange-500 transition-colors"
                title="重新生成 Token"
              >
                <RefreshCw
                  size={14}
                  className={regenerating ? "animate-spin" : ""}
                />
              </button>
            </div>
          </div>

          {/* Webhook 信息 */}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5 font-medium">
              Webhook
            </label>
            {bot.webhook_url ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-bg-page border border-panel-border rounded-lg text-xs">
                <Globe size={14} className="text-primary shrink-0" />
                <span className="text-text-primary truncate">
                  {bot.webhook_url}
                </span>
              </div>
            ) : (
              <p className="text-xs text-text-placeholder px-3 py-2 bg-bg-page border border-panel-border rounded-lg">
                未配置 Webhook URL
              </p>
            )}
            {bot.webhook_secret && (
              <p className="text-xs text-text-placeholder mt-1">
                Webhook Secret:{" "}
                <code className="bg-panel-border px-1 py-0.5 rounded">
                  {showToken
                    ? bot.webhook_secret
                    : "whsec-••••••••••••••••"}
                </code>
              </p>
            )}
          </div>

          {/* 编辑表单 */}
          {editing ? (
            <div className="space-y-3 p-4 bg-bg-page rounded-lg">
              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  名称
                </label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-panel-bg border border-panel-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  描述
                </label>
                <input
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-panel-bg border border-panel-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  Webhook URL
                </label>
                <input
                  value={editWebhook}
                  onChange={(e) => setEditWebhook(e.target.value)}
                  className="w-full px-3 py-2 bg-panel-bg border border-panel-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
                  placeholder="https://your-server.com/webhook"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-1.5 text-sm text-text-secondary hover:bg-list-hover rounded-lg"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editName.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving && <Loader2 size={12} className="animate-spin" />}
                  保存
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-text-secondary border border-panel-border rounded-lg hover:bg-list-hover transition-colors"
              >
                <Settings size={14} />
                编辑
              </button>
              <button
                onClick={handleToggleStatus}
                disabled={saving}
                className={`flex items-center gap-1 px-3 py-1.5 text-sm border border-panel-border rounded-lg hover:bg-list-hover transition-colors ${
                  bot.status === "active"
                    ? "text-orange-600"
                    : "text-green-600"
                }`}
              >
                {bot.status === "active" ? (
                  <>
                    <PowerOff size={14} />
                    禁用
                  </>
                ) : (
                  <>
                    <Power size={14} />
                    启用
                  </>
                )}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 border border-panel-border rounded-lg hover:bg-red-50 transition-colors"
              >
                {deleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                删除
              </button>
            </div>
          )}

          {/* 基本信息 */}
          <div className="text-xs text-text-placeholder space-y-1 pt-2 border-t border-panel-border">
            <p>
              ID: <code className="bg-panel-border px-1 py-0.5 rounded">{bot.id}</code>
            </p>
            <p>
              创建者: {bot.creator?.name || "未知"} · 创建时间:{" "}
              {new Date(bot.created_at).toLocaleString("zh-CN")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
