import BlockRefView from "@/components/node-views/BlockRefView.vue";
import { mergeAttributes, Node } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";

export const BlockRef = Node.create({
  name: "blockRef",
  group: "inline",
  inline: true,
  addAttributes() {
    return {
      blockId: { default: null },
      isTag: { default: false },
    };
  },
  parseHTML() {
    return [
      {
        tag: "span.block-ref",
        getAttrs(dom: HTMLElement) {
          return {
            blockId: dom.dataset.blockId,
            isTag: dom.dataset.isTag === "true",
          };
        },
      },
    ];
  },
  // renderHTML({ HTMLAttributes }) {
  //   return [
  //     "span",
  //     mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
  //     0,
  //   ];
  // },
  addNodeView() {
    return VueNodeViewRenderer(BlockRefView);
  },
});
