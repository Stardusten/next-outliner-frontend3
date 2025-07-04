import {
  Schema,
  type NodeSpec,
  type Node,
  type MarkSpec,
} from "prosemirror-model";

const text: NodeSpec = {
  group: "inline",
};

const blockRef: NodeSpec = {
  group: "inline",
  inline: true,
  attrs: {
    blockId: {},
  },
  toDOM(node) {
    return [
      "span",
      { class: "block-ref", "data-block-id": node.attrs.blockId },
      node.attrs.blockId,
    ];
  },
  parseDOM: [
    {
      tag: "span.block-ref",
      getAttrs(dom: HTMLElement) {
        return {
          blockId: dom.dataset.blockId,
        };
      },
    },
  ],
};

const file: NodeSpec = {
  group: "inline",
  inline: true,
  atom: true,
  attrs: {
    path: {},
    displayMode: { default: "inline" }, // inline | expanded | preview
    filename: {},
    type: {},
    size: {},
    extraInfo: { default: "" },
    status: { default: "uploaded" }, // "uploading-{progress}" | "uploaded" | "failed-{errorCode}"
  },
  parseDOM: [], // TODO
};

const lineBreak: NodeSpec = {
  group: "inline",
  inline: true,
  toDOM() {
    return ["br"];
  },
  parseDOM: [{ tag: "br" }],
};

const codeblock: NodeSpec = {
  group: "block",
  content: "inline*",
  code: true,
  attrs: {
    lang: { default: "plaintext" },
  },
  toDOM(node) {
    return [
      "pre",
      { "data-lang": node.attrs.lang, spellcheck: false },
      ["code", 0],
    ];
  },
  parseDOM: [
    {
      tag: "pre",
      getAttrs(dom: HTMLElement) {
        return {
          lang: dom.dataset.lang || "plaintext",
        };
      },
    },
  ],
};

const paragraph: NodeSpec = {
  group: "block",
  content: "inline*",
  toDOM() {
    return ["p", 0];
  },
  parseDOM: [{ tag: "p" }],
};

const listItem: NodeSpec = {
  group: "block",
  content: "paragraph | codeblock",
  attrs: {
    // 列表项的层级
    level: {},
    // 对应块的 ID
    blockId: {},
    // 是否折叠
    folded: { default: false },
    // 是否有子块
    hasChildren: { default: false },
    // 类型
    type: {},
    // 大模型是否正在针对此块思考
    thinking: { default: false },
  },
  parseDOM: [
    {
      tag: "div.list-item",
      getAttrs(dom: HTMLElement) {
        return {
          level: parseInt(dom.dataset.level || "0", 10),
          blockId: dom.dataset.blockId,
          folded: dom.dataset.folded === "true",
          hasChildren: dom.dataset.hasChildren === "true",
          type: dom.dataset.type,
        };
      },
    },
  ],
};

const link: MarkSpec = {
  attrs: {
    href: {},
  },
  inclusive: false,
  parseDOM: [
    {
      tag: "a[href]",
      getAttrs: (node: HTMLElement) => {
        return {
          href: node.getAttribute("href"),
        };
      },
    },
  ],
  toDOM(node) {
    const { href } = node.attrs;
    const a = document.createElement("a");
    a.href = href;
    a.spellcheck = false;
    // 点击在浏览器中打开链接
    a.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.open(href, "_blank");
    });
    return a;
  },
};

const code: MarkSpec = {
  parseDOM: [{ tag: "code" }],
  toDOM() {
    return ["code", { spellcheck: false }, 0];
  },
};

const italic: MarkSpec = {
  parseDOM: [
    { tag: "i" },
    { tag: "em" },
    { style: "font-style=italic" },
    { style: "font-style=normal", clearMark: (m) => m.type.name == "em" },
  ],
  toDOM() {
    return ["em", 0];
  },
};

const bold: MarkSpec = {
  parseDOM: [
    { tag: "strong" },
    {
      tag: "b",
      getAttrs: (node: HTMLElement) =>
        node.style.fontWeight != "normal" && null,
    },
    { style: "font-weight=400", clearMark: (m) => m.type.name == "strong" },
    {
      style: "font-weight",
      getAttrs: (value: string) =>
        /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null,
    },
  ],
  toDOM: () => {
    return ["strong", 0];
  },
};

const strikethrough: MarkSpec = {
  parseDOM: [
    { tag: "s" },
    { tag: "del" },
    { style: "text-decoration: line-through" },
  ],
  toDOM: () => {
    return ["s", 0];
  },
};

const underline: MarkSpec = {
  parseDOM: [{ tag: "u" }, { style: "text-decoration: underline" }],
  toDOM: () => {
    return ["u", 0];
  },
};

export const outlinerSchema = new Schema({
  nodes: {
    doc: {
      content: "listItem*",
    } satisfies NodeSpec,
    text,
    blockRef,
    codeblock,
    file,
    paragraph,
    listItem,
    lineBreak,
  },
  marks: {
    link,
    code,
    italic,
    bold,
    strikethrough,
    underline,
  },
});
