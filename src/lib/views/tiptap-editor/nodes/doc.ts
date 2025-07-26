import { Node } from "@tiptap/vue-3";

export const Doc = Node.create({
  name: "doc",
  topNode: true,
  content: "listItem*",
});
