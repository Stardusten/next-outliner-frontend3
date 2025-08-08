import SearchView from "@/components/node-views/SearchView.vue";
import { mergeAttributes, Node } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";

export const Search = Node.create({
  name: "search",
  group: "block",
  content: "inline*",
  addAttributes() {
    return {
      query: {},
      // undefined - 折叠的查询
      // "invalid" - 查询错误
      // number - 查询结果条数
      status: { isRequired: false },
    };
  },
  parseHTML() {
    return [
      {
        tag: "div.search",
        getAttrs: (dom: HTMLElement) => ({
          query: dom.dataset.query,
        }),
      },
    ];
  },
  // renderHTML({ HTMLAttributes }) {
  //   return [
  //     "div",
  //     mergeAttributes(HTMLAttributes, {
  //       class: "search",
  //       "data-query": HTMLAttributes.query,
  //       "data-invalid": HTMLAttributes.invalid,
  //     }),
  //     0,
  //   ];
  // },
  addNodeView() {
    return VueNodeViewRenderer(SearchView);
  },
});
