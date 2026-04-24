/**
 * 进度条自定义扩展
 * 可设置百分比的内联进度指示器
 * @author skylark
 */

import { Node, mergeAttributes } from "@tiptap/react";

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    progressBar: {
      insertProgress: (value: number) => ReturnType;
    };
  }
}

export const ProgressBar = Node.create({
  name: "progressBar",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      value: {
        default: 0,
        parseHTML: (el) => parseInt(el.getAttribute("data-value") || "0", 10),
        renderHTML: (attrs) => ({ "data-value": attrs.value }),
      },
      label: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-label") || "",
        renderHTML: (attrs) => (attrs.label ? { "data-label": attrs.label } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="progress"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const val = Math.min(100, Math.max(0, node.attrs.value || 0));
    const label = node.attrs.label || `${val}%`;
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "progress",
        class: "progress-bar",
      }),
      [
        "div",
        { class: "progress-track" },
        ["div", { class: "progress-fill", style: `width:${val}%` }],
      ],
      ["span", { class: "progress-label", contenteditable: "false" }, label],
    ];
  },

  addCommands() {
    return {
      insertProgress:
        (value: number) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: { value, label: `${value}%` },
            })
            .run();
        },
    };
  },
});
