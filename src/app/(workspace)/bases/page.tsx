/**
 * 多维表格列表页 → 重定向到云文档（多维表格已合并进云文档）
 * @author skylark
 */

import { redirect } from "next/navigation";

export default function BasesPage() {
  redirect("/docs");
}
