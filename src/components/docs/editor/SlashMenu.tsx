/**
 * 斜杠命令菜单
 * 空行输入 / 弹出命令面板，可快速插入各类内容块
 * @author skylark
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Editor } from "@tiptap/react";
import {
  Heading1, Heading2, Heading3, Heading4,
  List, ListOrdered, ListChecks,
  Quote, Code2, Minus,
  Info, AlertTriangle, CheckCircle2, XCircle,
  Table, Image as ImageIcon, Columns2,
  Pilcrow,
  ChevronRight, Video, GitBranch, BarChart3, Smile,
} from "lucide-react";

interface SlashMenuProps {
  editor: Editor;
}

interface MenuItem {
  label: string;
  description: string;
  icon: React.ElementType;
  iconClass?: string;
  action: (editor: Editor) => void;
  keywords: string[];
}

const MENU_ITEMS: MenuItem[] = [
  {
    label: "正文", description: "普通段落文本", icon: Pilcrow,
    action: (e) => e.chain().focus().setParagraph().run(),
    keywords: ["paragraph", "text", "正文", "p"],
  },
  {
    label: "标题 1", description: "大标题", icon: Heading1, iconClass: "text-blue-600",
    action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
    keywords: ["h1", "heading", "标题", "title"],
  },
  {
    label: "标题 2", description: "中标题", icon: Heading2, iconClass: "text-blue-500",
    action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    keywords: ["h2", "heading", "标题"],
  },
  {
    label: "标题 3", description: "小标题", icon: Heading3, iconClass: "text-blue-400",
    action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    keywords: ["h3", "heading", "标题"],
  },
  {
    label: "标题 4", description: "最小标题", icon: Heading4, iconClass: "text-blue-300",
    action: (e) => e.chain().focus().toggleHeading({ level: 4 }).run(),
    keywords: ["h4", "heading", "标题"],
  },
  {
    label: "无序列表", description: "圆点列表", icon: List,
    action: (e) => e.chain().focus().toggleBulletList().run(),
    keywords: ["bullet", "list", "ul", "列表"],
  },
  {
    label: "有序列表", description: "编号列表", icon: ListOrdered,
    action: (e) => e.chain().focus().toggleOrderedList().run(),
    keywords: ["ordered", "number", "ol", "列表"],
  },
  {
    label: "任务列表", description: "待办清单", icon: ListChecks, iconClass: "text-green-600",
    action: (e) => e.chain().focus().toggleTaskList().run(),
    keywords: ["task", "todo", "check", "任务"],
  },
  {
    label: "引用", description: "引用块", icon: Quote, iconClass: "text-purple-500",
    action: (e) => e.chain().focus().toggleBlockquote().run(),
    keywords: ["quote", "blockquote", "引用"],
  },
  {
    label: "代码块", description: "代码片段", icon: Code2, iconClass: "text-orange-500",
    action: (e) => e.chain().focus().toggleCodeBlock().run(),
    keywords: ["code", "pre", "代码"],
  },
  {
    label: "分割线", description: "水平分割线", icon: Minus,
    action: (e) => e.chain().focus().setHorizontalRule().run(),
    keywords: ["hr", "divider", "分割", "横线"],
  },
  {
    label: "信息提示", description: "蓝色信息块", icon: Info, iconClass: "text-blue-500",
    action: (e) => e.chain().focus().insertCallout("info").run(),
    keywords: ["info", "callout", "提示", "信息"],
  },
  {
    label: "警告提示", description: "黄色警告块", icon: AlertTriangle, iconClass: "text-amber-500",
    action: (e) => e.chain().focus().insertCallout("warning").run(),
    keywords: ["warning", "callout", "警告"],
  },
  {
    label: "成功提示", description: "绿色成功块", icon: CheckCircle2, iconClass: "text-green-500",
    action: (e) => e.chain().focus().insertCallout("success").run(),
    keywords: ["success", "callout", "成功"],
  },
  {
    label: "错误提示", description: "红色错误块", icon: XCircle, iconClass: "text-red-500",
    action: (e) => e.chain().focus().insertCallout("error").run(),
    keywords: ["error", "callout", "错误"],
  },
  {
    label: "表格", description: "3x3 数据表格", icon: Table,
    action: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    keywords: ["table", "grid", "表格"],
  },
  {
    label: "图片", description: "插入图片链接", icon: ImageIcon,
    action: (e) => {
      const url = prompt("请输入图片 URL：");
      if (url) e.chain().focus().setImage({ src: url }).run();
    },
    keywords: ["image", "img", "图片"],
  },
  {
    label: "分栏", description: "两列并排布局", icon: Columns2, iconClass: "text-indigo-500",
    action: (e) => e.chain().focus().insertColumns(2).run(),
    keywords: ["column", "columns", "分栏", "布局"],
  },
  {
    label: "折叠块", description: "可展开收起的内容", icon: ChevronRight, iconClass: "text-teal-500",
    action: (e) => e.chain().focus().insertDetails().run(),
    keywords: ["details", "toggle", "fold", "折叠", "收起"],
  },
  {
    label: "视频", description: "嵌入在线视频", icon: Video, iconClass: "text-rose-500",
    action: (e) => {
      const url = prompt("请输入视频 URL（支持 YouTube / Bilibili）：");
      if (url) e.chain().focus().insertVideo(url).run();
    },
    keywords: ["video", "youtube", "bilibili", "视频"],
  },
  {
    label: "流程图", description: "Mermaid 流程图/UML", icon: GitBranch, iconClass: "text-pink-500",
    action: (e) => e.chain().focus().insertMermaid().run(),
    keywords: ["mermaid", "diagram", "flowchart", "uml", "流程图"],
  },
  {
    label: "进度条", description: "任务进度指示器", icon: BarChart3, iconClass: "text-cyan-500",
    action: (e) => {
      const val = prompt("请输入进度百分比（0-100）：", "50");
      const num = parseInt(val || "50", 10);
      e.chain().focus().insertProgress(isNaN(num) ? 50 : Math.min(100, Math.max(0, num))).run();
    },
    keywords: ["progress", "bar", "进度", "百分比"],
  },
  {
    label: "表情", description: "插入 Emoji 表情", icon: Smile,
    action: (e) => {
      /* 表情通过工具栏的 EmojiPicker 组件插入，这里提供快速入口 */
      const emoji = prompt("输入表情（如 😀）或关键词：");
      if (emoji) e.chain().focus().insertContent(emoji).run();
    },
    keywords: ["emoji", "smile", "表情"],
  },
];

export default function SlashMenu({ editor }: SlashMenuProps) {
  const [show, setShow] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const slashPosRef = useRef<number | null>(null);

  const filteredItems = filter
    ? MENU_ITEMS.filter((item) =>
        item.label.toLowerCase().includes(filter.toLowerCase()) ||
        item.keywords.some((kw) => kw.includes(filter.toLowerCase()))
      )
    : MENU_ITEMS;

  const close = useCallback(() => {
    setShow(false);
    setFilter("");
    setSelectedIndex(0);
    slashPosRef.current = null;
  }, []);

  const execute = useCallback((index: number) => {
    const item = filteredItems[index];
    if (!item) return;
    /* 删除 / 及之后的过滤文本 */
    if (slashPosRef.current !== null) {
      const from = slashPosRef.current;
      const to = editor.state.selection.from;
      editor.chain().focus().deleteRange({ from, to }).run();
    }
    item.action(editor);
    close();
  }, [editor, filteredItems, close]);

  /* 监听编辑器输入 */
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      const { state } = editor;
      const { from } = state.selection;
      const textBefore = state.doc.textBetween(
        Math.max(0, from - 20), from, "\n"
      );

      /* 检测 / 触发 */
      const slashIndex = textBefore.lastIndexOf("/");
      if (slashIndex >= 0) {
        const afterSlash = textBefore.slice(slashIndex + 1);
        /* 只在行首或前面是空白时触发 */
        const charBeforeSlash = slashIndex > 0 ? textBefore[slashIndex - 1] : "\n";
        if (charBeforeSlash === "\n" || charBeforeSlash === " " || slashIndex === 0) {
          /* 计算菜单位置 */
          const coords = editor.view.coordsAtPos(from);
          const editorRect = editor.view.dom.closest(".overflow-y-auto")?.getBoundingClientRect();
          if (editorRect) {
            setPosition({
              top: coords.bottom - editorRect.top + 8,
              left: coords.left - editorRect.left,
            });
          }
          setFilter(afterSlash);
          setSelectedIndex(0);
          slashPosRef.current = from - afterSlash.length - 1;
          setShow(true);
          return;
        }
      }

      if (show) close();
    };

    editor.on("update", handleUpdate);
    return () => { editor.off("update", handleUpdate); };
  }, [editor, show, close]);

  /* 键盘导航 */
  useEffect(() => {
    if (!show) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filteredItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        execute(selectedIndex);
      } else if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [show, selectedIndex, filteredItems.length, execute, close]);

  /* 滚动选中项到可见区域 */
  useEffect(() => {
    if (!show || !menuRef.current) return;
    const el = menuRef.current.children[selectedIndex] as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, show]);

  if (!show || filteredItems.length === 0) return null;

  return (
    <div className="absolute z-50" style={{ top: position.top, left: position.left }}>
      <div
        ref={menuRef}
        className="w-64 max-h-80 overflow-y-auto bg-panel-bg rounded-xl shadow-xl border border-panel-border py-1"
      >
        {filteredItems.map((item, idx) => (
          <button
            key={item.label}
            onClick={() => execute(idx)}
            onMouseEnter={() => setSelectedIndex(idx)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors
              ${idx === selectedIndex ? "bg-list-hover" : ""}`}
          >
            <div className={`w-8 h-8 rounded-lg bg-bg-page flex items-center justify-center shrink-0 ${item.iconClass || "text-text-secondary"}`}>
              <item.icon size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">{item.label}</p>
              <p className="text-[10px] text-text-placeholder">{item.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
