/**
 * 企业邮箱工作台
 * @author skylark
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Inbox, Loader2, Mail, Paperclip, PenLine, RefreshCw, Send, Trash2, X } from "lucide-react";
import type { MailAccount, MailFolder, MailMessage } from "@/lib/types";

interface ApiResult<T> {
  success: boolean;
  data?: T;
  account?: MailAccount;
  error?: string;
}

interface MailDraftAttachment {
  file_name: string;
  file_size: number;
  mime_type: string;
  r2_key: string;
  url: string;
}

interface UploadResult {
  r2_key: string;
  file_name: string;
  file_size: number;
  file_mime: string;
  url: string;
}

const folders: { key: MailFolder; label: string; icon: typeof Inbox }[] = [
  { key: "inbox", label: "收件箱", icon: Inbox },
  { key: "sent", label: "已发送", icon: Send },
  { key: "archive", label: "归档", icon: Archive },
  { key: "trash", label: "垃圾箱", icon: Trash2 },
];

export default function MailPage() {
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [accountId, setAccountId] = useState("");
  const [folder, setFolder] = useState<MailFolder>("inbox");
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [selected, setSelected] = useState<MailMessage | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<MailDraftAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const currentAccount = useMemo(
    () => accounts.find((item) => item.id === accountId) || accounts[0] || null,
    [accounts, accountId]
  );

  /** 加载邮箱账号 */
  const loadAccounts = useCallback(async () => {
    const res = await fetch("/api/mail/accounts");
    const json = (await res.json()) as ApiResult<MailAccount[]>;
    if (!json.success) throw new Error(json.error || "加载邮箱账号失败");
    setAccounts(json.data || []);
    if (!accountId && json.data?.[0]) setAccountId(json.data[0].id);
  }, [accountId]);

  /** 加载邮件列表 */
  const loadMessages = useCallback(async () => {
    if (!currentAccount) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/mail/messages?account_id=${currentAccount.id}&folder=${folder}`);
      const json = (await res.json()) as ApiResult<MailMessage[]>;
      if (!json.success) throw new Error(json.error || "加载邮件失败");
      setMessages(json.data || []);
      setSelected(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [currentAccount, folder]);

  useEffect(() => {
    loadAccounts().catch((err) => {
      setError(String(err));
      setLoading(false);
    });
  }, [loadAccounts]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  /** 打开邮件详情 */
  const openMessage = async (message: MailMessage) => {
    if (!currentAccount) return;
    setError("");
    try {
      const res = await fetch(`/api/mail/messages/${message.id}?account_id=${currentAccount.id}`);
      const json = (await res.json()) as ApiResult<MailMessage>;
      if (!json.success || !json.data) throw new Error(json.error || "加载邮件详情失败");
      setSelected(json.data);
      if (!json.data.read_at) {
        await fetch(`/api/mail/messages/${message.id}/read?account_id=${currentAccount.id}`, { method: "POST" });
        const readAt = new Date().toISOString();
        setSelected((current) => current?.id === message.id ? { ...current, read_at: readAt } : current);
        setMessages((items) => items.map((item) => item.id === message.id ? { ...item, read_at: readAt } : item));
      }
    } catch (err) {
      setError(String(err));
    }
  };

  /** 上传待发送附件 */
  const handleAttachmentUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      const uploaded: MailDraftAttachment[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const json = (await res.json()) as ApiResult<UploadResult>;
        if (!json.success || !json.data) throw new Error(json.error || "附件上传失败");
        uploaded.push({
          file_name: json.data.file_name,
          file_size: json.data.file_size,
          mime_type: json.data.file_mime || "application/octet-stream",
          r2_key: json.data.r2_key,
          url: json.data.url,
        });
      }
      setAttachments((items) => [...items, ...uploaded]);
    } catch (err) {
      setError(String(err));
    } finally {
      setUploading(false);
    }
  };

  /** 移动当前邮件到指定文件夹 */
  const moveSelectedMessage = async (targetFolder: MailFolder) => {
    if (!currentAccount || !selected) return;
    setError("");
    try {
      const res = await fetch(`/api/mail/messages/${selected.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: currentAccount.id, folder: targetFolder }),
      });
      const json = (await res.json()) as ApiResult<null>;
      if (!json.success) throw new Error(json.error || "移动邮件失败");
      setMessages((items) => items.filter((item) => item.id !== selected.id));
      setSelected(null);
    } catch (err) {
      setError(String(err));
    }
  };

  /** 移入垃圾箱 */
  const deleteSelectedMessage = async () => {
    if (!currentAccount || !selected) return;
    setError("");
    try {
      const res = await fetch(`/api/mail/messages/${selected.id}?account_id=${currentAccount.id}`, { method: "DELETE" });
      const json = (await res.json()) as ApiResult<null>;
      if (!json.success) throw new Error(json.error || "删除邮件失败");
      setMessages((items) => items.filter((item) => item.id !== selected.id));
      setSelected(null);
    } catch (err) {
      setError(String(err));
    }
  };

  /** 发送邮件 */
  const handleSend = async () => {
    if (!currentAccount || !to.trim() || !subject.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: currentAccount.id,
          to: to.split(",").map((item) => item.trim()).filter(Boolean),
          cc: cc.split(",").map((item) => item.trim()).filter(Boolean),
          bcc: bcc.split(",").map((item) => item.trim()).filter(Boolean),
          subject: subject.trim(),
          text: body,
          attachments,
        }),
      });
      const json = (await res.json()) as ApiResult<MailMessage>;
      if (!json.success || !json.data) throw new Error(json.error || "发送失败");
      setTo("");
      setCc("");
      setBcc("");
      setSubject("");
      setBody("");
      setAttachments([]);
      setComposeOpen(false);
      if (folder === "sent") setMessages((items) => [json.data as MailMessage, ...items]);
      setFolder("sent");
    } catch (err) {
      setError(String(err));
    } finally {
      setSending(false);
    }
  };

  if (!loading && accounts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-page">
        <div className="text-center max-w-sm">
          <Mail size={48} className="mx-auto text-text-placeholder mb-4" />
          <h2 className="text-lg font-semibold text-text-primary">尚未分配企业邮箱</h2>
          <p className="text-sm text-text-secondary mt-2">请联系企业管理员在管理后台为你分配邮箱账号。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-bg-page overflow-hidden">
      <aside className="w-56 bg-panel-bg border-r border-panel-border flex flex-col">
        <div className="p-4 border-b border-panel-border">
          <h1 className="font-bold text-text-primary flex items-center gap-2"><Mail size={18} /> 企业邮箱</h1>
          <select value={currentAccount?.id || ""} onChange={(e) => setAccountId(e.target.value)}
            className="mt-3 w-full h-9 rounded-lg border border-panel-border px-2 text-xs outline-none">
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.address}</option>)}
          </select>
          <button onClick={() => setComposeOpen(true)}
            className="mt-3 w-full h-9 rounded-lg bg-primary text-white text-sm flex items-center justify-center gap-2">
            <PenLine size={14} /> 写邮件
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {folders.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.key} onClick={() => setFolder(item.key)}
                className={`w-full h-9 px-3 rounded-lg text-sm flex items-center gap-2 transition-colors
                  ${folder === item.key ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-list-hover"}`}>
                <Icon size={15} /> {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="w-80 bg-panel-bg border-r border-panel-border flex flex-col">
        <div className="h-12 px-4 border-b border-panel-border flex items-center justify-between">
          <span className="font-medium text-text-primary">{folders.find((item) => item.key === folder)?.label}</span>
          <button onClick={loadMessages} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-list-hover">
            <RefreshCw size={14} />
          </button>
        </div>
        {error && <p className="m-3 p-2 rounded bg-red-50 text-danger text-xs">{error}</p>}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={24} /></div>
          ) : messages.map((message) => (
            <button key={message.id} onClick={() => openMessage(message)}
              className={`w-full text-left p-3 border-b border-panel-border hover:bg-list-hover
                ${selected?.id === message.id ? "bg-primary/5" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm truncate ${message.read_at ? "text-text-secondary" : "font-semibold text-text-primary"}`}>
                  {folder === "sent" ? message.to_addresses.join(", ") : message.from_address}
                </p>
                <span className="text-[10px] text-text-placeholder shrink-0">
                  {new Date(message.received_at || message.sent_at || message.created_at).toLocaleDateString("zh-CN")}
                </span>
              </div>
              <p className="text-sm text-text-primary truncate mt-1">{message.subject || "(无主题)"}</p>
              <p className="text-xs text-text-placeholder truncate mt-1">{message.text_body}</p>
            </button>
          ))}
          {!loading && messages.length === 0 && <p className="p-6 text-center text-sm text-text-placeholder">暂无邮件</p>}
        </div>
      </section>

      <main className="flex-1 bg-panel-bg overflow-y-auto">
        {composeOpen ? (
          <div className="max-w-3xl mx-auto p-6 space-y-4">
            <h2 className="text-xl font-bold text-text-primary">写邮件</h2>
            <input value={to} onChange={(e) => setTo(e.target.value)}
              placeholder="收件人，多个地址用英文逗号分隔"
              className="w-full h-10 rounded-lg border border-panel-border px-3 text-sm outline-none focus:border-primary" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={cc} onChange={(e) => setCc(e.target.value)}
                placeholder="抄送（可选）"
                className="w-full h-10 rounded-lg border border-panel-border px-3 text-sm outline-none focus:border-primary" />
              <input value={bcc} onChange={(e) => setBcc(e.target.value)}
                placeholder="密送（可选）"
                className="w-full h-10 rounded-lg border border-panel-border px-3 text-sm outline-none focus:border-primary" />
            </div>
            <input value={subject} onChange={(e) => setSubject(e.target.value)}
              placeholder="主题"
              className="w-full h-10 rounded-lg border border-panel-border px-3 text-sm outline-none focus:border-primary" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)}
              placeholder="正文"
              className="w-full h-64 rounded-lg border border-panel-border p-3 text-sm outline-none focus:border-primary resize-none" />
            {attachments.length > 0 && (
              <div className="rounded-lg border border-panel-border divide-y divide-panel-border">
                {attachments.map((attachment) => (
                  <div key={attachment.r2_key} className="h-10 px-3 flex items-center justify-between text-sm">
                    <a href={attachment.url} target="_blank" rel="noreferrer"
                      className="text-primary hover:underline truncate">
                      {attachment.file_name}
                    </a>
                    <button onClick={() => setAttachments((items) => items.filter((item) => item.r2_key !== attachment.r2_key))}
                      className="w-7 h-7 rounded flex items-center justify-center text-text-secondary hover:bg-list-hover">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <label className="h-10 px-4 rounded-lg border border-panel-border text-sm hover:bg-list-hover flex items-center gap-2 cursor-pointer">
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <Paperclip size={15} />}
                添加附件
                <input type="file" multiple className="hidden" disabled={uploading}
                  onChange={(e) => handleAttachmentUpload(e.target.files)} />
              </label>
              <button onClick={handleSend} disabled={sending || !to.trim() || !subject.trim()}
                className="h-10 px-4 rounded-lg bg-primary text-white text-sm flex items-center gap-2 disabled:opacity-50">
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} 发送
              </button>
              <button onClick={() => setComposeOpen(false)}
                className="h-10 px-4 rounded-lg border border-panel-border text-sm hover:bg-list-hover">取消</button>
            </div>
          </div>
        ) : selected ? (
          <article className="max-w-3xl mx-auto p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <h2 className="text-2xl font-bold text-text-primary">{selected.subject || "(无主题)"}</h2>
              <div className="flex gap-2 shrink-0">
                {folder !== "archive" && (
                  <button onClick={() => moveSelectedMessage("archive")}
                    className="h-9 px-3 rounded-lg border border-panel-border text-sm hover:bg-list-hover flex items-center gap-1.5">
                    <Archive size={14} /> 归档
                  </button>
                )}
                {folder !== "trash" && (
                  <button onClick={deleteSelectedMessage}
                    className="h-9 px-3 rounded-lg border border-panel-border text-sm text-danger hover:bg-red-50 flex items-center gap-1.5">
                    <Trash2 size={14} /> 删除
                  </button>
                )}
              </div>
            </div>
            <div className="mt-4 p-4 rounded-lg bg-bg-page text-sm text-text-secondary space-y-1">
              <p>发件人：{selected.from_address}</p>
              <p>收件人：{selected.to_addresses.join(", ")}</p>
              {selected.cc_addresses.length > 0 && <p>抄送：{selected.cc_addresses.join(", ")}</p>}
              <p>时间：{new Date(selected.received_at || selected.sent_at || selected.created_at).toLocaleString("zh-CN")}</p>
            </div>
            {selected.attachments && selected.attachments.length > 0 && (
              <div className="mt-4 p-3 rounded-lg border border-panel-border">
                <p className="text-sm font-medium text-text-primary mb-2">附件</p>
                {selected.attachments.map((attachment) => (
                  <a key={attachment.id} href={attachment.url} target="_blank"
                    className="block text-sm text-primary hover:underline" rel="noreferrer">
                    {attachment.file_name}
                  </a>
                ))}
              </div>
            )}
            <div className="mt-6 prose prose-sm max-w-none text-text-primary whitespace-pre-wrap">
              {selected.html_body ? (
                <div dangerouslySetInnerHTML={{ __html: selected.html_body }} />
              ) : (
                selected.text_body || ""
              )}
            </div>
          </article>
        ) : (
          <div className="h-full flex items-center justify-center text-text-placeholder">
            选择一封邮件查看详情，或点击“写邮件”开始发信
          </div>
        )}
      </main>
    </div>
  );
}
