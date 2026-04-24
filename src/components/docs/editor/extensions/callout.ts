/**
 * Callout 提示块自定义扩展
 * 支持 info / warning / success / error 四种类型
 * @author skylark
 */

import { Node, mergeAttributes } from "@tiptap/react";

export type CalloutType = "info" | "warning" | "success" | "error";

const CALLOUT_ICONS: Record<CalloutType, string> = {
  info: "ℹ️",
  warning: "⚠️",
  success: "✅",
  error: "❌",
};

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    callout: {
      insertCallout: (type: CalloutType) => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      type: {
        default: "info" as CalloutType,
        parseHTML: (el) => el.getAttribute("data-type") || "info",
        renderHTML: (attrs) => ({ "data-type": attrs.type }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[class="callout"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const calloutType = (node.attrs.type || "info") as CalloutType;
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "callout", "data-type": calloutType }),
      ["span", { class: "callout-icon", contenteditable: "false" }, CALLOUT_ICONS[calloutType]],
      ["div", { class: "callout-content" }, 0],
    ];
  },

  addCommands() {
    return {
      insertCallout:
        (type: CalloutType) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: { type },
              content: [{ type: "paragraph" }],
            })
            .run();
        },
    };
  },
});
