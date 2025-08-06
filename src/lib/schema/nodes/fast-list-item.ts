import { Node } from "@tiptap/vue-3";
import { ListItem } from "./list-item";
import { FastListItemNodeView } from "../../views/read-only-block/fast-list-item";

const listItemConfig = { ...ListItem.config };
delete listItemConfig.addNodeView;

export const FastListItem = Node.create({
  ...listItemConfig,
  name: "fastListItem",
  addNodeView() {
    return (props) => new FastListItemNodeView(props.node);
  },
});
