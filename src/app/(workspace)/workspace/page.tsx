/**
 * 工作台页面（占位）
 * @author skylark
 */

import { LayoutGrid } from "lucide-react";

export default function WorkspacePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg-page">
      <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center mb-4">
        <LayoutGrid size={32} className="text-primary" />
      </div>
      <h2 className="text-lg font-semibold text-text-primary mb-2">工作台</h2>
      <p className="text-text-secondary text-sm">更多功能即将推出</p>
    </div>
  );
}
