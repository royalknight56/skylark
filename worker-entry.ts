/**
 * Cloudflare Worker 入口
 *
 * 构建流程：opennextjs-cloudflare build → postbuild 脚本将 ChatRoom 导出追加到 .open-next/worker.js
 * 此文件仅作为 postbuild 脚本的来源参考，实际 wrangler main 指向 .open-next/worker.js
 *
 * @author skylark
 */

export { ChatRoom } from "./src/durable-objects/ChatRoom";
