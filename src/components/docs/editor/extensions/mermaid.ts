/**
 * Mermaid 流程图/UML 图自定义扩展
 * 在编辑器中以代码块形式输入 Mermaid 语法，渲染为图表
 * @author skylark
 */

import { Node, mergeAttributes } from "@tiptap/react";

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    mermaidBlock: {
      insertMermaid: () => ReturnType;
    };
  }
}

export const MermaidBlock = Node.create({
  name: "mermaidBlock",
  group: "block",
  atom: false,
  content: "text*",
  marks: "",
  code: true,
  defining: true,

  parseHTML() {
    return [{ tag: 'pre[data-type="mermaid"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "pre",
      mergeAttributes(HTMLAttributes, {
        "data-type": "mermaid",
        class: "mermaid-block",
      }),
      ["code", 0],
    ];
  },

  addCommands() {
    return {
      insertMermaid:
        () =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              content: [
                {
                  type: "text",
                  text: "graph TD\n  A[开始] --> B{条件判断}\n  B -->|是| C[处理]\n  B -->|否| D[结束]",
                },
              ],
            })
            .run();
        },
    };
  },
});
