/**
 * Cloudflare Worker 入口
 * 复用 OpenNext 生成的 fetch 处理器，并导出 ChatRoom Durable Object（wrangler 要求从入口模块导出 DO 类）
 * @author skylark
 */

// 由 `opennextjs-cloudflare build` 生成；未构建时 IDE 可能报错，可忽略
// @ts-ignore
import { default as openNextHandler } from "./.open-next/worker.js";
import { ChatRoom } from "./src/durable-objects/ChatRoom";

export default {
  fetch: openNextHandler.fetch,
} satisfies ExportedHandler<CloudflareEnv>;

export { ChatRoom };
