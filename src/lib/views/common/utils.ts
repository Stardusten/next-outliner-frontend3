import type { BlockId } from "@/lib/common/types";
import { detachedSchema } from "@/lib/schema/schema";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorState } from "@tiptap/pm/state";

/**
 * 将相对一个块开头的偏移量转换为文档内的绝对位置
 */
export function getAbsPos(
  doc: ProseMirrorNode,
  blockId: BlockId,
  offset: number
): number | null {
  let absolutePos: number | null = null;
  const listItem = detachedSchema.nodes.listItem;

  doc.descendants((node, pos) => {
    if (absolutePos !== null) return false; // 已找到，停止搜索

    if (node.type.name === listItem.name && node.attrs.blockId === blockId) {
      // listItem 的内容是 paragraph，文本从 pos + 2 开始。
      const paragraphNode = node.firstChild;
      if (paragraphNode) {
        const maxOffset = paragraphNode.content.size;
        const finalOffset = Math.min(offset, maxOffset);
        absolutePos = pos + 1 + 1 + finalOffset;
      }
      return false; // 停止搜索
    }
  });
  return absolutePos;
}

export function findCurrListItem(state: EditorState) {
  const { $from } = state.selection;
  const listItem = detachedSchema.nodes.listItem;

  for (let i = $from.depth; i > 0; i--) {
    const node = $from.node(i);
    if (node.type.name === listItem.name) {
      return { node, depth: i, pos: $from.before(i) };
    }
  }
  return null;
}

/**
 *  查找包含给定文档位置的 listItem 节点
 * @param doc Prosemirror 文档
 * @param pos 文档中的绝对位置
 */
export function findListItemAtPos(doc: ProseMirrorNode, pos: number) {
  const $pos = doc.resolve(pos);
  const listItem = detachedSchema.nodes.listItem;

  for (let i = $pos.depth; i > 0; i--) {
    const node = $pos.node(i);
    if (node.type.name === listItem.name) {
      return { node, pos: $pos.before(i) };
    }
  }
  return null;
}

export function getSelectedListItemInfo(state: EditorState) {
  const { from, to } = state.selection;
  const startItemInfo = findListItemAtPos(state.doc, from);
  const endItemInfo = findListItemAtPos(state.doc, to);
  return {
    start: startItemInfo,
    end: endItemInfo,
    cross: startItemInfo?.pos !== endItemInfo?.pos,
  };
}
