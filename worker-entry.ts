/**
 * Cloudflare Worker 入口
 * 复用 OpenNext 生成的 fetch 处理器，并导出 ChatRoom Durable Object
 * @author skylark
 */

// @ts-ignore — 由 opennextjs-cloudflare build 生成
import openNextHandler from "./.open-next/worker.js";

export default {
  async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
    return openNextHandler.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<CloudflareEnv>;

// Durable Object 必须从入口模块导出
export { ChatRoom } from "./src/durable-objects/ChatRoom";
