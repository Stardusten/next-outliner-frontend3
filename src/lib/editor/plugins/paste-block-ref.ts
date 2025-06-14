import { Plugin } from "prosemirror-state";
import { parseBlockRefStr } from "../utils";
import { Fragment, Slice } from "prosemirror-model";
import { outlinerSchema } from "../schema";

export const pasteBlockRefPlugin = new Plugin({
  props: {
    handlePaste(view, event) {
      const text = event.clipboardData?.getData("text/plain");
      if (text == null) return false;

      const parsed = parseBlockRefStr(text);
      if (parsed == null) return false;

      const blockId = parsed;

      // 插入块引用
      let tr = view.state.tr;
      const blockRef = outlinerSchema.nodes.blockRef.create({ blockId });
      tr = tr.replaceSelectionWith(blockRef);
      view.dispatch(tr);

      return true;
    },
  },
});
