import { Schema, type NodeSpec, type Node, type MarkSpec } from "prosemirror-model";

function getTriangleDiv(className?: string) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 15 15");

  const triangle = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  triangle.setAttribute("points", "5,5 10,5 7.5,10");
  triangle.setAttribute("fill", "currentColor");

  svg.appendChild(triangle);

  if (className) {
    svg.classList.add(className);
  }

  return svg;
}

function getDotDiv(className?: string) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 15 15");

  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", "7.5");
  circle.setAttribute("cy", "7.5");
  circle.setAttribute("r", "2.5");
  circle.setAttribute("fill", "currentColor");

  svg.appendChild(circle);

  if (className) {
    svg.classList.add(className);
  }

  return svg;
}

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

const codeblock: NodeSpec = {
  group: "block",
  content: "inline*",
  code: true,
  attrs: {
    lang: { default: "plaintext" },
  },
  toDOM(node) {
    return ["pre", { "data-lang": node.attrs.lang }, ["code", 0]];
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
  },
  toDOM(node: Node) {
    const el = document.createElement("div");
    el.classList.add("list-item");
    el.dataset.level = node.attrs.level;
    el.dataset.blockId = node.attrs.blockId;
    el.dataset.folded = String(node.attrs.folded);
    el.dataset.hasChildren = String(node.attrs.hasChildren);
    el.dataset.type = node.attrs.type;
    el.style.setProperty("--level", node.attrs.level);

    const left = document.createElement("div");
    left.classList.add("list-item-left");
    left.appendChild(getTriangleDiv("fold-btn"));
    left.appendChild(getDotDiv("bullet"));

    const content = document.createElement("div");
    content.classList.add("list-item-content");

    el.appendChild(left);
    el.appendChild(content);

    return { dom: el, contentDOM: content };
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
      getAttrs: (node: HTMLElement) => node.style.fontWeight != "normal" && null,
    },
    { style: "font-weight=400", clearMark: (m) => m.type.name == "strong" },
    {
      style: "font-weight",
      getAttrs: (value: string) => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null,
    },
  ],
  toDOM: () => {
    return ["strong", 0];
  },
};

const strikethrough: MarkSpec = {
  parseDOM: [{ tag: "s" }, { tag: "del" }, { style: "text-decoration: line-through" }],
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
    paragraph,
    listItem,
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
