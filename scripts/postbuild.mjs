/**
 * postbuild 脚本
 * 在 opennextjs-cloudflare build 之后执行，向 .open-next/worker.js 追加 Durable Object 导出
 * @author skylark
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const workerPath = resolve(process.cwd(), ".open-next/worker.js");

const marker = "/* -- skylark-custom-exports -- */";
const chatRoomExport = `
${marker}
// Durable Objects（由 postbuild 脚本追加）
export { ChatRoom } from "../src/durable-objects/ChatRoom.ts";
export { NotificationHub } from "../src/durable-objects/NotificationHub.ts";
`;

let content = readFileSync(workerPath, "utf-8");

// 防止重复追加
if (!content.includes(marker)) {
  content += chatRoomExport;
  writeFileSync(workerPath, content, "utf-8");
  console.log("✅ ChatRoom export appended to .open-next/worker.js");
} else {
  console.log("ℹ️  ChatRoom export already present, skipping.");
}
