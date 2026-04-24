/**
 * 折叠块 (Details/Toggle) 自定义扩展
 * 可展开/收起的内容块，类似 HTML <details>
 * @author skylark
 */

import { Node, mergeAttributes } from "@tiptap/react";

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    details: {
      insertDetails: () => ReturnType;
    };
  }
}

/** 折叠容器 */
export const Details = Node.create({
  name: "details",
  group: "block",
  content: "detailsSummary detailsContent",
  defining: true,

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (el) => el.hasAttribute("open"),
        renderHTML: (attrs) => (attrs.open ? { open: "" } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "details" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["details", mergeAttributes(HTMLAttributes, { class: "details-block" }), 0];
  },

  addCommands() {
    return {
      insertDetails:
        () =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: { open: true },
              content: [
                { type: "detailsSummary", content: [{ type: "text", text: "点击展开" }] },
                { type: "detailsContent", content: [{ type: "paragraph" }] },
              ],
            })
            .run();
        },
    };
  },
});

/** 折叠块标题 */
export const DetailsSummary = Node.create({
  name: "detailsSummary",
  content: "inline*",
  defining: true,

  parseHTML() {
    return [{ tag: "summary" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["summary", mergeAttributes(HTMLAttributes, { class: "details-summary" }), 0];
  },
});

/** 折叠块内容 */
export const DetailsContent = Node.create({
  name: "detailsContent",
  content: "block+",
  defining: true,

  parseHTML() {
    return [{ tag: 'div[class="details-content"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "details-content" }), 0];
  },
});
