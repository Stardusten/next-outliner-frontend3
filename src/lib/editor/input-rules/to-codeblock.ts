import { InputRule } from "prosemirror-inputrules";
import { outlinerSchema } from "../schema";
import { TextSelection } from "prosemirror-state";
import { findCurrListItem } from "../editor";

export const toCodeblock: InputRule = new InputRule(
  /^[·`]{3}([a-z]+) $/,
  (state, match, start, end) => {
    const currListItem = findCurrListItem(state);
    if (currListItem == null) return null;

    // 检查光标是否在列表项末尾
    const { $from } = state.selection;
    const paragraph = $from.parent;
    if ($from.parentOffset !== paragraph.content.size) return null;

    // 将 currentListItem 的内容换成空 codeblock
    const tr = state.tr;
    const lang = match[1];
    const codeblock = outlinerSchema.nodes.codeblock.create({ lang });

    // 更新列表项的类型为 code
    tr.setNodeMarkup(currListItem.pos, null, {
      ...currListItem.node.attrs,
      type: "code",
    });

    // 替换内容为代码块
    tr.replaceWith(
      currListItem.pos + 1,
      currListItem.pos + currListItem.node.nodeSize - 1,
      codeblock
    );

    // 将光标移动到代码块的第一个字符
    tr.setSelection(TextSelection.create(tr.doc, currListItem.pos + 2));

    return tr;
  }
);
