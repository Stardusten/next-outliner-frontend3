import CodeblockView from "@/components/node-views/CodeblockView.vue";
import { mergeAttributes, Node } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";

export const Codeblock = Node.create({
  name: "codeblock",
  group: "block",
  content: "inline*",
  code: true,
  addAttributes() {
    return {
      lang: { default: "plaintext" },
    };
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      "pre",
      mergeAttributes(HTMLAttributes, {
        "data-lang": node.attrs.lang,
        spellcheck: false,
      }),
      ["code", 0],
    ];
  },
  addNodeView() {
    return VueNodeViewRenderer(CodeblockView);
  },
  parseHTML() {
    return [
      {
        tag: "pre",
        getAttrs(dom: HTMLElement) {
          return {
            lang: dom.dataset.lang || "plaintext",
          };
        },
      },
    ];
  },
});
