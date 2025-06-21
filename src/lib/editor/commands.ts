import { nanoid } from "nanoid";
import {
  TextSelection,
  type Command,
  type EditorState,
} from "prosemirror-state";
import type {
  BlockStorage,
  BlockTransactionMetadata,
  SelectionMetadata,
} from "../storage/interface";
import type { BlockId } from "@/lib/blocks/types";
import {
  buildBlockRefStr,
  getSelectedListItemInfo,
  oldSerialize,
  oldDeserialize,
} from "./utils";
import { outlinerSchema } from "./schema";
import { Node } from "prosemirror-model";
import type { Editor } from "./interface";

export function findCurrListItem(state: EditorState) {
  const { $from } = state.selection;
  for (let i = $from.depth; i > 0; i--) {
    const node = $from.node(i);
    if (node.type.name === "listItem") {
      return { node, depth: i, pos: $from.before(i) };
    }
  }
  return null;
}

export function getCurrSelection(state: EditorState): SelectionMetadata | null {
  const sel = state.selection;
  const listItemInfo = findCurrListItem(state);
  return listItemInfo && listItemInfo.node.attrs.blockId
    ? {
        blockId: listItemInfo.node.attrs.blockId,
        anchor: sel.from - (listItemInfo.pos + 2),
      }
    : null;
}

export function isEmptyListItem(node: Node): boolean {
  const pNode = node.firstChild;
  if (!pNode) return true;
  return pNode.content.size === 0;
}

export function promoteSelected(storage: BlockStorage): Command {
  return function (state, dispatch) {
    const { start, end, cross } = getSelectedListItemInfo(state);
    if (!start || !end || cross) {
      return true;
    }

    const { node, pos } = start;
    const { blockId } = node.attrs;
    if (!blockId) return false;

    // 缩进后，光标位置仍然保持在当前块的相同位置
    const anchor = state.selection.from - (pos + 2);

    const tx = storage.createTransaction();
    tx.metadata.selection = { blockId, anchor };
    tx.promoteBlock(blockId);
    tx.commit();
    return true;
  };
}

export function demoteSelected(storage: BlockStorage): Command {
  return function (state, dispatch) {
    const { start, end, cross } = getSelectedListItemInfo(state);
    if (!start || !end || cross) {
      return true;
    }

    const { node, pos } = start;
    const { blockId } = node.attrs;
    if (!blockId) return false;

    // 反缩进后，光标位置仍然保持在当前块的相同位置
    const anchor = state.selection.from - (pos + 2);

    const tx = storage.createTransaction();
    tx.metadata.selection = { blockId, anchor };
    tx.demoteBlock(blockId);
    tx.commit();
    return true;
  };
}

export function splitListItem(storage: BlockStorage): Command {
  return function (state, dispatch) {
    const { $from } = state.selection;

    const listItemInfo = findCurrListItem(state);
    if (!listItemInfo) return false;

    const { node: listItem } = listItemInfo;
    const blockId = listItem.attrs.blockId as string;
    const newBlockId = nanoid();

    const currentBlock = storage.getBlock(blockId);
    if (!currentBlock) return false;

    // 获取当前段落节点
    const paragraphNode = listItem.firstChild;
    if (!paragraphNode) return false;

    // 计算分割点
    const splitPos = $from.parentOffset;

    // 创建分割前的段落内容
    const beforeContent = paragraphNode.cut(0, splitPos);
    const afterContent = paragraphNode.cut(splitPos);

    // 序列化内容
    const beforeSerialized = oldSerialize(beforeContent);
    const afterSerialized = oldSerialize(afterContent);

    // 提取纯文本内容
    const beforeText = beforeContent.textContent;
    const afterText = afterContent.textContent;

    // 计算新块的分数索引
    const parentBlock = currentBlock.get().parentBlock;
    const siblings = parentBlock
      ? parentBlock.get().childrenBlocks
      : storage.getRootBlocks();
    const currentIndex = siblings.findIndex((b) => b.get().id === blockId);

    const currentFractionalIndex = currentBlock.get().fractionalIndex;

    let newFractionalIndex: number;

    // 如果在块的开头分割（splitPos === 0），新块应该在当前块之前
    if (splitPos === 0) {
      const prevSibling = currentIndex > 0 ? siblings[currentIndex - 1] : null;
      const prevSiblingFractionalIndex = prevSibling
        ? prevSibling.get().fractionalIndex
        : currentFractionalIndex - 2;
      newFractionalIndex =
        (prevSiblingFractionalIndex + currentFractionalIndex) / 2;
    } else {
      // 否则，新块在当前块之后
      const nextSibling =
        currentIndex > -1 && currentIndex < siblings.length - 1
          ? siblings[currentIndex + 1]
          : null;
      const nextSiblingFractionalIndex = nextSibling
        ? nextSibling.get().fractionalIndex
        : currentFractionalIndex + 2;
      newFractionalIndex =
        (currentFractionalIndex + nextSiblingFractionalIndex) / 2;
    }

    // 决定更新哪个块的内容和创建哪个块
    let updateBlockId: string;
    let updateContent: string;
    let newBlockContent: string;
    let focusBlockId: string;
    let focusOffset: number;

    if (splitPos === 0) {
      // 在开头分割：创建空的新块，保持当前块内容不变
      updateBlockId = blockId;
      updateContent = oldSerialize(paragraphNode); // 保持原内容
      newBlockContent = oldSerialize(outlinerSchema.nodes.paragraph.create()); // 创建空段落
      focusBlockId = blockId; // 焦点保持在原块
      focusOffset = 0; // 光标在开头
    } else {
      // 在中间或末尾分割：更新当前块为分割前内容，新块为分割后内容
      updateBlockId = blockId;
      updateContent = beforeSerialized;
      newBlockContent = afterSerialized;
      focusBlockId = newBlockId; // 焦点移到新块
      focusOffset = 0; // 光标在新块开头
    }

    // 创建事务
    const tx = storage.createTransaction();
    tx.metadata.selection = { blockId: focusBlockId, anchor: focusOffset };

    // 1. 更新当前块的内容
    tx.updateBlock({
      id: updateBlockId,
      content: updateContent,
    });

    // 2. 添加新块
    tx.addBlock({
      id: newBlockId,
      type: "text",
      folded: false,
      parentId: currentBlock.get().parentId,
      fractionalIndex: newFractionalIndex,
      content: newBlockContent,
    });

    tx.commit();
    return true;
  };
}

export function deleteEmptyListItem(
  storage: BlockStorage,
  direction: "backward" | "forward" = "backward"
): Command {
  return function (state, dispatch) {
    const { $from, empty } = state.selection;
    // 该命令只在光标位于块开头且没有选中内容时触发
    if (!empty || $from.parentOffset !== 0) {
      return false;
    }

    const listItemInfo = findCurrListItem(state);
    if (!listItemInfo) {
      return false;
    }

    // 块必须为空
    if (listItemInfo.node.textContent.length > 0) {
      return false;
    }

    const blockId = listItemInfo.node.attrs.blockId as string;
    if (!blockId) {
      return false;
    }

    const currentBlock = storage.getBlock(blockId);
    if (!currentBlock) {
      return false;
    }

    // 不删除有子块的块
    if (currentBlock.get().childrenBlocks.length > 0) {
      return false;
    }

    // 确定删除后要聚焦的块 - 直接在 ProseMirror 文档中查找
    let focusTarget: { blockId: string; anchor: number } | null = null;

    if (direction === "forward") {
      // Delete 键：找下一个 listItem
      let nextListItemPos: number | null = null;
      state.doc.descendants((node, pos) => {
        if (nextListItemPos !== null) return false; // 已找到，停止搜索
        if (pos > listItemInfo.pos && node.type.name === "listItem") {
          nextListItemPos = pos;
          return false;
        }
      });

      if (nextListItemPos !== null) {
        const nextListItem = state.doc.nodeAt(nextListItemPos);
        if (nextListItem) {
          const nextBlockId = nextListItem.attrs.blockId as string;
          focusTarget = { blockId: nextBlockId, anchor: 0 };
        }
      }
    } else {
      // Backspace 键：找前一个 listItem
      let prevListItemPos: number | null = null;
      state.doc.descendants((node, pos) => {
        if (pos < listItemInfo.pos && node.type.name === "listItem") {
          prevListItemPos = pos; // 继续找，保留最后一个（最接近的）
        }
      });

      if (prevListItemPos !== null) {
        const prevListItem = state.doc.nodeAt(prevListItemPos);
        if (prevListItem) {
          const prevBlockId = prevListItem.attrs.blockId as string;
          const prevBlockData = storage.getBlock(prevBlockId);
          if (prevBlockData) {
            const content = storage.getTextContent(prevBlockId);
            focusTarget = { blockId: prevBlockId, anchor: content.length };
          }
        }
      }
    }

    if (!focusTarget) {
      // 如果这是编辑器中唯一的根块，则不删除
      return false;
    }

    const tx = storage.createTransaction();
    tx.metadata.selection = focusTarget;
    tx.deleteBlock(blockId);
    tx.commit();

    return true;
  };
}

export function selectCurrentListItem(): Command {
  return function (state, dispatch) {
    const listItemInfo = findCurrListItem(state);
    if (!listItemInfo) {
      return false;
    }

    const { node: listItem, pos } = listItemInfo;

    // listItem 的内容是一个 paragraph 节点。
    // 文本内容的起始位置在 listItem 和 paragraph 的开标签之后，即 pos + 2。
    const from = pos + 2;

    // 根据 schema，listItem 的第一个也是唯一一个子节点是 paragraph。
    // paragraphNode.content.size 就是其内部文本内容的长度。
    const paragraphNode = listItem.firstChild!;
    const to = from + paragraphNode.content.size;

    // 创建一个覆盖从 'from' 到 'to' 的文本选区。
    const selection = TextSelection.create(state.doc, from, to);

    if (dispatch) {
      const tr = state.tr.setSelection(selection);
      dispatch(tr);
    }

    return true;
  };
}

/**
 * 删除选中的内容
 *
 * - 如果选择为空，pass
 * - 如果选中了多个 listItem，stop
 */
export function deleteSelected(): Command {
  return function (state, dispatch) {
    const { from, to, empty } = state.selection;

    if (empty) {
      return false; // 该命令仅处理非空选择。
    }

    const { start, end, cross } = getSelectedListItemInfo(state);
    if (!start || !end || cross) {
      return true;
    }

    // 选择在单个 listItem 内
    const { node: listItem, pos: listItemPos } = start;
    const paragraphNode = listItem.firstChild;

    if (!paragraphNode) {
      return false;
    }

    const paraContentStartPos = listItemPos + 2; // 在 listItem 和段落开标签之后
    const paraContentEndPos = paraContentStartPos + paragraphNode.content.size;

    // 如果试图删除整个块的内容，将块内容替换为空
    // 因为默认行为会直接删掉这个块
    if (from <= paraContentStartPos && to >= paraContentEndPos) {
      if (dispatch) {
        const tr = state.tr.replaceWith(
          paraContentStartPos,
          paraContentEndPos,
          []
        );
        dispatch(tr);
      }
      return true;
    }

    // 如果是在单个块内的部分选择，则让 Prosemirror 处理。
    return false;
  };
}

export function toggleFocusedFoldState(
  storage: BlockStorage,
  targetState?: boolean,
  blockId?: BlockId
): Command {
  return function (state, dispatch) {
    const listItemInfo = findCurrListItem(state);
    if (!listItemInfo) {
      return false;
    }

    const { node: listItem, pos } = listItemInfo;

    let blockId2 = blockId;
    if (blockId2 == null) {
      blockId2 = listItem.attrs.blockId as string;
      if (blockId2 == null) {
        return false;
      }
    }

    const currentBlock = storage.getBlock(blockId2);
    // 只有存在子块的块才能被折叠/展开
    if (!currentBlock || currentBlock.get().childrenBlocks.length === 0) {
      return false;
    }

    const currentFoldedState = currentBlock.get().folded;
    // 保留光标位置
    const anchor = state.selection.from - (pos + 2);

    targetState ??= !currentFoldedState;

    if (targetState === currentFoldedState) {
      return false;
    }

    const tx = storage.createTransaction();
    tx.metadata.selection = { blockId: blockId2, anchor };
    tx.updateBlock({
      id: blockId2,
      folded: targetState,
    });
    tx.commit();
    return true;
  };
}

export function copyBlockRef(): Command {
  return function (state, dispatch) {
    const listItemInfo = findCurrListItem(state);
    if (listItemInfo == null) return true;

    const blockId = listItemInfo.node.attrs.blockId;
    if (blockId == null) return true;

    if (navigator.clipboard) {
      const clipboard = navigator.clipboard as any;
      if (clipboard.writeText) {
        // 现代浏览器，异步 Clipboard API
        try {
          navigator.clipboard.writeText(buildBlockRefStr(blockId));
        } catch (err) {
          console.warn("Failed to copy block ref to clipboard");
        }
      }
    }

    return true;
  };
}

export function moveBlockUp(storage: BlockStorage): Command {
  return function (state, dispatch) {
    const listItemInfo = findCurrListItem(state);
    if (!listItemInfo) {
      return false;
    }

    const { node: listItem, pos } = listItemInfo;
    const blockId = listItem.attrs.blockId as string;
    if (!blockId) {
      return false;
    }

    const currentBlock = storage.getBlock(blockId);
    if (!currentBlock) {
      return false;
    }

    const currentBlockData = currentBlock.get();
    const parentBlock = currentBlockData.parentBlock;
    const siblings = parentBlock
      ? parentBlock.get().childrenBlocks
      : storage.getRootBlocks();
    const currentIndex = siblings.findIndex((b) => b.get().id === blockId);

    // 如果已经是第一个块，无法上移
    if (currentIndex <= 0) {
      return false;
    }

    const prevSibling = siblings[currentIndex - 1];
    const prevSiblingData = prevSibling.get();

    // 计算新的 fractionalIndex，将当前块移到前一个兄弟块的位置
    const beforePrevSibling =
      currentIndex > 1 ? siblings[currentIndex - 2] : null;
    const beforePrevSiblingFractionalIndex = beforePrevSibling
      ? beforePrevSibling.get().fractionalIndex
      : prevSiblingData.fractionalIndex - 2;

    const newFractionalIndex =
      (beforePrevSiblingFractionalIndex + prevSiblingData.fractionalIndex) / 2;

    // 保留光标位置
    const anchor = state.selection.from - (pos + 2);

    const tx = storage.createTransaction();
    tx.metadata.selection = { blockId, anchor };
    tx.updateBlock({
      id: blockId,
      fractionalIndex: newFractionalIndex,
    });
    tx.commit();

    return true;
  };
}

export function moveBlockDown(storage: BlockStorage): Command {
  return function (state, dispatch) {
    const listItemInfo = findCurrListItem(state);
    if (!listItemInfo) {
      return false;
    }

    const { node: listItem, pos } = listItemInfo;
    const blockId = listItem.attrs.blockId as string;
    if (!blockId) {
      return false;
    }

    const currentBlock = storage.getBlock(blockId);
    if (!currentBlock) {
      return false;
    }

    const currentBlockData = currentBlock.get();
    const parentBlock = currentBlockData.parentBlock;
    const siblings = parentBlock
      ? parentBlock.get().childrenBlocks
      : storage.getRootBlocks();
    const currentIndex = siblings.findIndex((b) => b.get().id === blockId);

    // 如果已经是最后一个块，无法下移
    if (currentIndex < 0 || currentIndex >= siblings.length - 1) {
      return false;
    }

    const nextSibling = siblings[currentIndex + 1];
    const nextSiblingData = nextSibling.get();

    // 计算新的 fractionalIndex，将当前块移到下一个兄弟块的位置
    const afterNextSibling =
      currentIndex + 2 < siblings.length ? siblings[currentIndex + 2] : null;
    const afterNextSiblingFractionalIndex = afterNextSibling
      ? afterNextSibling.get().fractionalIndex
      : nextSiblingData.fractionalIndex + 2;

    const newFractionalIndex =
      (nextSiblingData.fractionalIndex + afterNextSiblingFractionalIndex) / 2;

    // 保留光标位置
    const offset = state.selection.from - (pos + 2);

    const tx = storage.createTransaction();
    tx.metadata.selection = { blockId, anchor: offset };
    tx.updateBlock({
      id: blockId,
      fractionalIndex: newFractionalIndex,
    });
    tx.commit();

    return true;
  };
}

export function mergeWithPreviousBlock(storage: BlockStorage): Command {
  return function (state, dispatch) {
    const { $from, empty } = state.selection;

    // 只在光标位于块开头且没有选中内容时触发
    if (!empty || $from.parentOffset !== 0) {
      return false;
    }

    const listItemInfo = findCurrListItem(state);
    if (!listItemInfo) {
      return false;
    }

    const { node: currentListItem } = listItemInfo;
    const currentBlockId = currentListItem.attrs.blockId as string;
    if (!currentBlockId) {
      return false;
    }

    const currentBlock = storage.getBlock(currentBlockId);
    if (!currentBlock) {
      return false;
    }

    const currentBlockData = currentBlock.get();

    // 不能合并有子块的块
    if (currentBlockData.childrenBlocks.length > 0) {
      return false;
    }

    // 找到前一个可以合并的块
    const parentBlock = currentBlockData.parentBlock;
    const siblings = parentBlock
      ? parentBlock.get().childrenBlocks
      : storage.getRootBlocks();
    const currentIndex = siblings.findIndex(
      (b) => b.get().id === currentBlockId
    );

    // 如果是第一个块，无法合并
    if (currentIndex <= 0) {
      return false;
    }

    // 找到前一个兄弟块（同级别）
    const prevSibling = siblings[currentIndex - 1];
    const prevBlockData = prevSibling.get();
    const prevBlockId = prevBlockData.id;

    // 只能合并同类型的文本块
    if (prevBlockData.type !== "text" || currentBlockData.type !== "text") {
      return false;
    }

    // 前一个块不能有子块，或者前一个块是折叠的（这样合并会比较复杂）
    if (prevBlockData.childrenBlocks.length > 0) {
      return false;
    }

    // 获取当前块的段落节点
    const currentParagraphNode = currentListItem.firstChild;
    if (!currentParagraphNode) {
      return false;
    }

    // 获取前一个块的内容用于合并
    const prevBlockLoaded = storage.getBlock(prevBlockId);
    if (!prevBlockLoaded) {
      return false;
    }

    const prevBlockContent = prevBlockLoaded.get().content as string;

    // 解析前一个块的内容
    let prevParagraphNode;
    try {
      if (prevBlockContent && prevBlockContent.trim() !== "") {
        prevParagraphNode = oldDeserialize(prevBlockContent);
      } else {
        prevParagraphNode = outlinerSchema.nodes.paragraph.create();
      }
    } catch (error) {
      // 如果解析失败，创建包含纯文本的段落
      const prevTextContent = storage.getTextContent(prevBlockId);
      prevParagraphNode = outlinerSchema.nodes.paragraph.create(
        null,
        prevTextContent ? [outlinerSchema.text(prevTextContent)] : []
      );
    }

    // 合并两个段落的内容
    let mergedParagraphNode;
    const prevContentSize = prevParagraphNode.content.size;

    if (prevContentSize === 0) {
      // 前一个块为空，直接使用当前块的内容
      mergedParagraphNode = currentParagraphNode;
    } else if (currentParagraphNode.content.size === 0) {
      // 当前块为空，直接使用前一个块的内容
      mergedParagraphNode = prevParagraphNode;
    } else {
      // 两个块都有内容，需要合并
      const mergedContent = prevParagraphNode.content.append(
        currentParagraphNode.content
      );
      mergedParagraphNode = outlinerSchema.nodes.paragraph.create(
        null,
        mergedContent
      );
    }

    // 序列化合并后的内容
    const mergedSerialized = oldSerialize(mergedParagraphNode);

    // 计算光标在合并后的位置（在原前一个块内容的末尾）
    const mergePoint = prevContentSize;

    const tx = storage.createTransaction();
    tx.metadata.selection = { blockId: prevBlockId, anchor: mergePoint };

    // 1. 更新前一个块的内容为合并后的内容
    tx.updateBlock({
      id: prevBlockId,
      content: mergedSerialized,
    });

    // 2. 删除当前块
    tx.deleteBlock(currentBlockId);

    tx.commit();

    return true;
  };
}

/**
 * 在代码块中插入换行，并继承上一行的缩进
 */
export function codeblockInsertLineBreak(): Command {
  return function (state, dispatch) {
    if (!dispatch) return true;

    const { from } = state.selection;
    const doc = state.doc;
    const $from = doc.resolve(from);

    // 找到当前行的开始位置
    const textBefore = $from.parent.textContent.substring(
      0,
      $from.parentOffset
    );
    const lastNewlineIndex = textBefore.lastIndexOf("\n");
    const lineStart = lastNewlineIndex === -1 ? 0 : lastNewlineIndex + 1;

    // 获取当前行的内容
    const currentLineText = $from.parent.textContent.substring(lineStart);

    // 计算当前行的缩进
    let indentLevel = 0;
    for (let i = 0; i < currentLineText.length; i++) {
      if (currentLineText[i] === " ") {
        indentLevel++;
      } else if (currentLineText[i] === "\t") {
        indentLevel += 2; // 将 tab 视为 2 个空格
      } else {
        break;
      }
    }

    // 创建新行内容：换行符 + 相同的缩进
    const indent = " ".repeat(indentLevel);
    const newLineContent = "\n" + indent;

    const tr = state.tr;
    tr.insertText(newLineContent);
    dispatch(tr);

    return true;
  };
}

/**
 * 在代码块中添加缩进（Tab）
 */
export function codeblockIndent(): Command {
  return function (state, dispatch) {
    if (!dispatch) return true;

    const { from, to } = state.selection;
    const tr = state.tr;
    const indentStr = "  "; // 使用 2 个空格作为缩进

    if (from === to) {
      // 没有选中内容，直接插入缩进
      tr.insertText(indentStr);
    } else {
      // 有选中内容，对选中范围内的每一行添加缩进
      const doc = state.doc;
      const startPos = from;
      const endPos = to;

      // 获取选中文本
      const selectedText = doc.textBetween(startPos, endPos);
      const lines = selectedText.split("\n");

      // 对每一行添加缩进
      const indentedText = lines.map((line) => indentStr + line).join("\n");

      tr.replaceWith(startPos, endPos, state.schema.text(indentedText));

      // 调整选区以保持选中状态
      const newEndPos = startPos + indentedText.length;
      tr.setSelection(TextSelection.create(tr.doc, startPos, newEndPos));
    }

    dispatch(tr);
    return true;
  };
}

/**
 * 在代码块中移除缩进（Shift+Tab）
 */
export function codeblockOutdent(): Command {
  return function (state, dispatch) {
    if (!dispatch) return true;

    const { from, to } = state.selection;
    const tr = state.tr;
    const indentStr = "  "; // 2 个空格的缩进

    if (from === to) {
      // 没有选中内容，尝试移除当前行的缩进
      const doc = state.doc;
      const $from = doc.resolve(from);

      // 找到当前行的开始位置
      const textBefore = $from.parent.textContent.substring(
        0,
        $from.parentOffset
      );
      const lastNewlineIndex = textBefore.lastIndexOf("\n");
      const lineStart = lastNewlineIndex === -1 ? 0 : lastNewlineIndex + 1;
      const lineStartPos = from - $from.parentOffset + lineStart;

      // 检查行首是否有缩进可以移除
      const lineText = $from.parent.textContent.substring(lineStart);
      if (lineText.startsWith(indentStr)) {
        tr.delete(lineStartPos, lineStartPos + indentStr.length);
      } else if (lineText.startsWith(" ")) {
        // 如果只有一个空格，也移除它
        tr.delete(lineStartPos, lineStartPos + 1);
      }
    } else {
      // 有选中内容，对选中范围内的每一行移除缩进
      const doc = state.doc;
      const selectedText = doc.textBetween(from, to);
      const lines = selectedText.split("\n");

      // 对每一行移除缩进
      const outdentedLines = lines.map((line) => {
        if (line.startsWith(indentStr)) {
          return line.substring(indentStr.length);
        } else if (line.startsWith(" ")) {
          return line.substring(1);
        }
        return line;
      });

      const outdentedText = outdentedLines.join("\n");
      tr.replaceWith(from, to, state.schema.text(outdentedText));

      // 调整选区
      const newEndPos = from + outdentedText.length;
      tr.setSelection(TextSelection.create(tr.doc, from, newEndPos));
    }

    dispatch(tr);
    return true;
  };
}

/**
 * 在代码块中选择全部内容
 */
export function codeblockSelectAll(): Command {
  return function (state, dispatch) {
    const listItemInfo = findCurrListItem(state);
    if (!listItemInfo) {
      return false;
    }

    const { node: listItem, pos } = listItemInfo;
    const codeblockNode = listItem.firstChild;
    if (!codeblockNode || codeblockNode.type.name !== "codeblock") {
      return false;
    }

    // 代码块内容的起始和结束位置
    const from = pos + 2; // listItem + codeblock 开标签
    const to = from + codeblockNode.content.size;

    if (dispatch) {
      const selection = TextSelection.create(state.doc, from, to);
      const tr = state.tr.setSelection(selection);
      dispatch(tr);
    }

    return true;
  };
}

/**
 * 在代码块中移动到行首
 */
export function codeblockMoveToLineStart(): Command {
  return function (state, dispatch) {
    const { from } = state.selection;
    const doc = state.doc;
    const $from = doc.resolve(from);

    // 找到当前行的开始位置
    const textBefore = $from.parent.textContent.substring(
      0,
      $from.parentOffset
    );
    const lastNewlineIndex = textBefore.lastIndexOf("\n");

    if (lastNewlineIndex === -1) {
      // 已经在第一行，移动到代码块开头
      const listItemInfo = findCurrListItem(state);
      if (!listItemInfo) return false;

      const lineStartPos = from - $from.parentOffset;
      if (dispatch) {
        const selection = TextSelection.create(state.doc, lineStartPos);
        dispatch(state.tr.setSelection(selection));
      }
    } else {
      // 移动到当前行开头
      const lineStartOffset = lastNewlineIndex + 1;
      const lineStartPos = from - $from.parentOffset + lineStartOffset;
      if (dispatch) {
        const selection = TextSelection.create(state.doc, lineStartPos);
        dispatch(state.tr.setSelection(selection));
      }
    }

    return true;
  };
}

/**
 * 在代码块中移动到行尾
 */
export function codeblockMoveToLineEnd(): Command {
  return function (state, dispatch) {
    const { from } = state.selection;
    const doc = state.doc;
    const $from = doc.resolve(from);

    // 找到当前行的结束位置
    const textAfter = $from.parent.textContent.substring($from.parentOffset);
    const nextNewlineIndex = textAfter.indexOf("\n");

    if (nextNewlineIndex === -1) {
      // 已经在最后一行，移动到代码块末尾
      const lineEndPos = from - $from.parentOffset + $from.parent.content.size;
      if (dispatch) {
        const selection = TextSelection.create(state.doc, lineEndPos);
        dispatch(state.tr.setSelection(selection));
      }
    } else {
      // 移动到当前行末尾
      const lineEndPos = from + nextNewlineIndex;
      if (dispatch) {
        const selection = TextSelection.create(state.doc, lineEndPos);
        dispatch(state.tr.setSelection(selection));
      }
    }

    return true;
  };
}

export function undo(editor: Editor): Command {
  return function (state, dispatch) {
    if (!editor.canUndo()) return false;
    if (dispatch) {
      editor.undo();
    }
    return true;
  };
}

export function redo(editor: Editor): Command {
  return function (state, dispatch) {
    if (!editor.canRedo()) return false;
    if (dispatch) {
      editor.redo();
    }
    return true;
  };
}
