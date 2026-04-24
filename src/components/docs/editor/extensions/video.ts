/**
 * 视频嵌入自定义扩展
 * 支持 YouTube / Bilibili / 通用视频 URL
 * @author skylark
 */

import { Node, mergeAttributes } from "@tiptap/react";

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    video: {
      insertVideo: (src: string) => ReturnType;
    };
  }
}

/** 将视频 URL 转为可嵌入的 iframe src */
function toEmbedUrl(url: string): string {
  /* YouTube */
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

  /* Bilibili */
  const bvMatch = url.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/);
  if (bvMatch) return `https://player.bilibili.com/player.html?bvid=${bvMatch[1]}&autoplay=0`;

  /* 通用 — 如果已经是 embed 链接直接使用 */
  return url;
}

export const Video = Node.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="video"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const embedSrc = toEmbedUrl(node.attrs.src || "");
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "video",
        class: "video-embed",
      }),
      [
        "iframe",
        {
          src: embedSrc,
          frameborder: "0",
          allowfullscreen: "true",
          allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
          class: "video-iframe",
        },
      ],
    ];
  },

  addCommands() {
    return {
      insertVideo:
        (src: string) =>
        ({ chain }) => {
          return chain()
            .insertContent({ type: this.name, attrs: { src } })
            .run();
        },
    };
  },
});
