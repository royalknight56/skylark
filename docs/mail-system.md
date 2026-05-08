# 企业邮箱系统验证说明

> @author skylark

## Cloudflare 配置前提

- 在 Cloudflare 控制台为企业域名启用 Email Routing / Email Service。
- 将需要接收的地址路由到 `skylark` Worker。
- 确认 `wrangler.jsonc` 已配置 `send_email` binding：`EMAIL`。
- 注册验证邮件复用 `EMAIL` binding，`AUTH_EMAIL_FROM` 已配置为 `no-reply@rustpoint.com`，需要确保该地址在 Cloudflare 可发送。
- 注册验证邮件展示名固定为 `Skylark`。

## 本地收信模拟

使用 Wrangler 模拟 Email Routing 入站事件：

```bash
npx wrangler dev
```

另开终端发送原始 RFC 5322 邮件：

```bash
curl --request POST 'http://localhost:8787/cdn-cgi/handler/email?from=sender@example.com&to=user@company.com' \
  --data-raw $'From: Sender <sender@example.com>\nTo: user@company.com\nSubject: Test Mail\nMessage-ID: <test-001@example.com>\nDate: Mon, 27 Apr 2026 12:00:00 +0000\n\n这是一封测试邮件。'
```

验证点：

- `mail_messages` 生成一条 `direction = inbound`、`folder = inbox` 的记录。
- `mail_attachments` 生成一条 `raw.eml` 记录，R2 中存在对应原始邮件。
- `/mail` 页面收件箱能看到邮件并打开详情。

## 发信验证

本地默认会模拟 `send_email` binding；需要真实发信时可使用 Cloudflare remote binding 或部署 Worker 后测试。

验证步骤：

1. 管理后台 `/admin/mail` 新增邮箱域名。
2. 标记域名可用，并为成员分配邮箱账号。
3. 进入 `/mail`，点击“写邮件”发送到外部邮箱。
4. 验证 `mail_messages` 生成一条 `direction = outbound`、`folder = sent` 的记录。

## 已知边界

- 入站邮件当前保留原始 `.eml` 到 R2，并解析基础头部和正文；复杂 MIME 附件可后续接入 `postal-mime` 完整解析。
- Cloudflare 控制台中的 Email Routing 地址绑定仍需管理员手动完成。
