/**
 * Emoji 表情选择器
 * 分类展示常用 Emoji，支持搜索过滤
 * @author skylark
 */

"use client";

import { useState, useRef, useEffect } from "react";
import type { Editor } from "@tiptap/react";
import { Smile, X } from "lucide-react";

interface EmojiPickerProps {
  editor: Editor;
}

interface EmojiCategory {
  name: string;
  emojis: string[];
}

const CATEGORIES: EmojiCategory[] = [
  {
    name: "常用",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂",
      "🙂", "😊", "😇", "🥰", "😍", "😘", "😗", "😚",
      "👍", "👎", "👏", "🙌", "🤝", "💪", "✌️", "🤞",
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
      "⭐", "🌟", "✨", "💫", "🔥", "💯", "🎉", "🎊",
      "✅", "❌", "⚠️", "❓", "❗", "💡", "📌", "🔔",
    ],
  },
  {
    name: "表情",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂",
      "🙂", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗",
      "😚", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗",
      "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶",
      "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪",
      "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🥵",
      "🥶", "🥴", "😵", "🤯", "😎", "🥳", "😱", "😨",
      "😰", "😥", "😢", "😭", "😤", "😡", "🤬", "😈",
    ],
  },
  {
    name: "手势",
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏",
      "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆",
      "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜",
      "👏", "🙌", "👐", "🤲", "🤝", "🙏", "💪", "🦾",
    ],
  },
  {
    name: "物品",
    emojis: [
      "📱", "💻", "⌨️", "🖥️", "📷", "📸", "📹", "🎥",
      "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️",
      "⏰", "📎", "📌", "📍", "🔑", "🔒", "🔓", "🔐",
      "📦", "📫", "📬", "📭", "📮", "🗳️", "📝", "📋",
      "📊", "📈", "📉", "📄", "📃", "📑", "📁", "📂",
    ],
  },
  {
    name: "符号",
    emojis: [
      "✅", "❌", "❓", "❗", "‼️", "⁉️", "💯", "🔴",
      "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪", "🟤",
      "⬛", "⬜", "◼️", "◻️", "▪️", "▫️", "🔶", "🔷",
      "🔸", "🔹", "🔺", "🔻", "💠", "⭐", "🌟", "✨",
      "⚡", "🔥", "💥", "💫", "💤", "💢", "💬", "💭",
      "🏷️", "🔖", "📌", "🔔", "🔕", "🎵", "🎶", "🎼",
    ],
  },
];

export default function EmojiPicker({ editor }: EmojiPickerProps) {
  const [show, setShow] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(0);
  const btnRef = useRef<HTMLButtonElement>(null);

  /* 点击外部关闭 */
  useEffect(() => {
    if (!show) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".emoji-picker-container")) setShow(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [show]);

  const insertEmoji = (emoji: string) => {
    editor.chain().focus().insertContent(emoji).run();
    setShow(false);
  };

  /* 搜索时扁平化所有 emoji */
  const allEmojis = search
    ? CATEGORIES.flatMap((c) => c.emojis).filter((e, i, arr) => arr.indexOf(e) === i)
    : [];

  return (
    <div className="relative emoji-picker-container">
      <button
        ref={btnRef}
        onClick={() => setShow(!show)}
        title="插入表情"
        className={`w-8 h-8 rounded flex items-center justify-center transition-colors
          ${show ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-list-hover hover:text-text-primary"}`}
      >
        <Smile size={15} />
      </button>

      {show && (
        <div className="absolute left-0 top-9 w-72 bg-panel-bg rounded-xl shadow-xl border border-panel-border z-50">
          {/* 搜索 */}
          <div className="p-2 border-b border-panel-border">
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索表情…"
              className="w-full h-7 px-2.5 rounded-lg bg-bg-page text-xs text-text-primary outline-none
                placeholder:text-text-placeholder border-none" />
          </div>

          {/* 分类标签 */}
          {!search && (
            <div className="flex items-center gap-1 px-2 py-1.5 border-b border-panel-border">
              {CATEGORIES.map((cat, idx) => (
                <button key={cat.name} onClick={() => setActiveCategory(idx)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors
                    ${idx === activeCategory ? "bg-primary/10 text-primary" : "text-text-placeholder hover:text-text-secondary"}`}>
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Emoji 网格 */}
          <div className="p-2 max-h-48 overflow-y-auto">
            <div className="grid grid-cols-8 gap-0.5">
              {(search ? allEmojis : CATEGORIES[activeCategory].emojis).map((emoji, idx) => (
                <button key={`${emoji}-${idx}`} onClick={() => insertEmoji(emoji)}
                  className="w-8 h-8 rounded flex items-center justify-center text-lg
                    hover:bg-list-hover hover:scale-110 transition-all">
                  {emoji}
                </button>
              ))}
            </div>
            {search && allEmojis.length === 0 && (
              <p className="text-center text-text-placeholder text-[10px] py-4">未找到匹配的表情</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
