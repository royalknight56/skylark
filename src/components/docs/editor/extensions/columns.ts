/**
 * 分栏布局自定义扩展
 * 支持 2-3 列并排布局，每列可独立编辑内容
 * @author skylark
 */

import { Node, mergeAttributes } from "@tiptap/react";

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    columns: {
      insertColumns: (count: number) => ReturnType;
    };
  }
}

/** 分栏容器 */
export const Columns = Node.create({
  name: "columns",
  group: "block",
  content: "column{2,3}",
  defining: true,

  parseHTML() {
    return [{ tag: 'div[class="columns"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "columns" }), 0];
  },

  addCommands() {
    return {
      insertColumns:
        (count: number) =>
        ({ chain }) => {
          const cols = Array.from({ length: count }, () => ({
            type: "column",
            content: [{ type: "paragraph" }],
          }));
          return chain()
            .insertContent({ type: this.name, content: cols })
            .run();
        },
    };
  },
});

/** 单列 */
export const Column = Node.create({
  name: "column",
  group: "",
  content: "block+",
  defining: true,

  parseHTML() {
    return [{ tag: 'div[class="column"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "column" }), 0];
  },
});
