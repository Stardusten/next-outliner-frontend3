import { useAttachment } from "@/composables";
import { nanoid } from "nanoid";
import { Node } from "prosemirror-model";
import { NodeSelection, TextSelection, type Command } from "prosemirror-state";
import type { EditorId } from "../app/app";
import type { AttachmentTaskInfo } from "../app/attachment/storage";
import type { BlockId } from "../common/types";
import { editorUtils, findCurrListItem, type Editor } from "./editor";
import { getFileDisplayMode, getFileType } from "./node-views/file/common";
import { outlinerSchema } from "./schema";
import {
  buildBlockRefStr,
  getSelectedListItemInfo,
  oldDeserialize,
  oldSerialize,
} from "./utils";
import { getBlockData, getBlockNode } from "../app/block-manage";
import { getTextContent } from "../app/index/text-content";
import { withTx } from "../app/tx";
import { toast } from "vue-sonner";

export function isEmptyListItem(node: Node): boolean {
  const pNode = node.firstChild;
  if (!pNode) return true;
  return pNode.content.size === 0;
}

export function promoteSelected(editor: Editor): Command {
  return function (state, dispatch) {
    withTx(editor.app, (tx) => {
      if (!editor.view) return;
      const state = editor.view.state;
      const { start, end, cross } = getSelectedListItemInfo(state);
      if (!start || !end || cross) return;

      const { node, pos } = start;
      const { blockId } = node.attrs;
      if (!blockId) return;

      const parentId = tx.getParentId(blockId);
      if (!parentId)
        throw new Error(`target 块 ${blockId} 没有父节点，根块不能反缩进`);
      const parentIndex = tx.getIndex(parentId);
      if (parentIndex === null)
        throw new Error(`找不到父节点 ${parentId} 的 index`);
      const grandParentId = tx.getParentId(parentId);
      tx.moveBlock(blockId, grandParentId, parentIndex + 1);

      // 缩进后，光标位置仍然保持在当前块的相同位置
      const anchor = state.selection.from - (pos + 2);
      tx.setSelection({ editorId: editor.id, blockId, anchor });
      tx.setOrigin("localEditorStructural");
    });
    return true;
  };
}

export function demoteSelected(editor: Editor): Command {
  return function (state, dispatch) {
    withTx(editor.app, (tx) => {
      const { start, end, cross } = getSelectedListItemInfo(state);
      if (!start || !end || cross) return;

      const { node, pos } = start;
      const { blockId } = node.attrs;
      if (!blockId) return;

      const parentId = tx.getParentId(blockId);
      const index = tx.getIndex(blockId)!;
      if (index === 0)
        throw new Error(`target 块 ${blockId} 是第一个块，不能缩进`);
      const prevNodeId = tx.getChildrenIds(parentId)[index - 1];
      const newIndex = tx.getChildrenIds(prevNodeId)!.length;
      tx.moveBlock(blockId, prevNodeId, newIndex);

      // 缩进后，光标位置仍然保持在当前块的相同位置
      const anchor = state.selection.from - (pos + 2);
      tx.setSelection({ editorId: editor.id, blockId, anchor });
      tx.setOrigin("localEditorStructural");
    });
    return true;
  };
}

export function splitListItem(editor: Editor): Command {
  return function (state, dispatch) {
    if (!editor.view) return false;

    const { $from } = state.selection;
    const currListItem = findCurrListItem(state);
    if (!currListItem) return false;

    const { node: listItem } = currListItem;
    const currBlockId = listItem.attrs.blockId as BlockId;

    const currentBlockNode = getBlockNode(editor.app, currBlockId);
    if (!currentBlockNode) return false;

    const paragraphNode = listItem.firstChild;
    if (!paragraphNode) return false;

    const splitPos = $from.parentOffset;
    if (splitPos === 0) {
      withTx(editor.app, (tx) => {
        // 在开头分割：当前块上方创建空的新块，保持当前块内容不变
        const newContent = oldSerialize(
          outlinerSchema.nodes.paragraph.create()
        );
        const newBlockId = tx.createBlockBefore(currBlockId, {
          type: "text",
          folded: false,
          content: newContent,
        });
        // 要求聚焦到新块
        tx.setSelection({
          editorId: editor.id,
          blockId: newBlockId,
          anchor: 0,
        });
        tx.setOrigin("localEditorStructural");
      });
    } else {
      withTx(editor.app, (tx) => {
        // 在中间或末尾分割：更新当前块为分割前内容，新块为分割后内容
        const beforeContent = paragraphNode.cut(0, splitPos);
        const afterContent = paragraphNode.cut(splitPos);
        const beforeSerialized = oldSerialize(beforeContent);
        const afterSerialized = oldSerialize(afterContent);
        tx.updateBlock(currBlockId, { content: beforeSerialized });
        const newBlockId = tx.createBlockAfter(currBlockId, {
          type: "text",
          folded: false,
          content: afterSerialized,
        });
        // 要求聚焦到新块开头
        tx.setSelection({
          editorId: editor.id,
          blockId: newBlockId,
          anchor: 0,
        });
        tx.setOrigin("localEditorStructural");
      });
    }

    return true;
  };
}

export function deleteEmptyListItem(
  editor: Editor,
  direction: "backward" | "forward" = "backward"
): Command {
  return function (state, dispatch) {
    if (!editor.view) return false;
    const { $from, empty } = state.selection;
    // 该命令只在光标位于块开头且没有选中内容时触发
    if (!empty || $from.parentOffset !== 0) return false;

    const listItemInfo = findCurrListItem(state);
    if (!listItemInfo) return false;

    // 块必须为空
    if (listItemInfo.node.textContent.length > 0) return false;

    const blockId = listItemInfo.node.attrs.blockId as BlockId;
    if (!blockId) return false;

    const currentBlockNode = getBlockNode(editor.app, blockId);
    if (!currentBlockNode) return false;

    const children = currentBlockNode.children() ?? [];

    // 不删除有子块的块
    if (children.length > 0) return false;

    // 确定删除后要聚焦的块 - 直接在 ProseMirror 文档中查找
    let focusTarget: {
      editorId: EditorId;
      blockId: BlockId;
      anchor: number;
    } | null = null;

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
          const nextBlockId = nextListItem.attrs.blockId as BlockId;
          focusTarget = {
            editorId: editor.id,
            blockId: nextBlockId,
            anchor: 0,
          };
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
          const prevBlockId = prevListItem.attrs.blockId as BlockId;
          const prevBlockData = getBlockData(editor.app, prevBlockId);
          if (prevBlockData) {
            const content = getTextContent(editor.app, prevBlockId);
            focusTarget = {
              editorId: editor.id,
              blockId: prevBlockId,
              anchor: content.length,
            };
          }
        }
      }
    }

    // 如果这是编辑器中唯一的根块，则不删除
    if (!focusTarget) return false;

    withTx(editor.app, (tx) => {
      tx.deleteBlock(blockId);
      tx.setSelection(focusTarget);
      tx.setOrigin("localEditorStructural");
    });

    return true;
  };
}

export function selectCurrentListItem(editor: Editor): Command {
  return function (state, dispatch) {
    if (!editor.view) return false;

    const listItemInfo = findCurrListItem(state);
    if (!listItemInfo) return false;

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

    if (empty) return false; // 该命令仅处理非空选择。

    const { start, end, cross } = getSelectedListItemInfo(state);
    if (!start || !end || cross) return true;

    // 选择在单个 listItem 内
    const { node: listItem, pos: listItemPos } = start;
    const paragraphNode = listItem.firstChild;

    if (!paragraphNode) return false;

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
  editor: Editor,
  targetState?: boolean,
  blockId?: BlockId
): Command {
  return function (state, dispatch) {
    let targetBlockId = blockId;
    if (!editor.view) return false;
    const listItemInfo = findCurrListItem(state);
    if (!listItemInfo) return false;

    if (!targetBlockId) {
      targetBlockId = listItemInfo.node.attrs.blockId as BlockId;
      if (!targetBlockId) return false;
    }

    const currentBlockData = getBlockData(editor.app, targetBlockId);
    if (!currentBlockData || targetState === currentBlockData.folded) {
      return true;
    }

    withTx(editor.app, (tx) => {
      tx.updateBlock(targetBlockId, {
        folded: targetState ?? !currentBlockData.folded,
      });
      tx.setOrigin("localEditorStructural");
    });

    return true;
  };
}

export function copyBlockRef(editor: Editor): Command {
  return function (state, dispatch) {
    if (!editor.view) return false;
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

export function moveBlockUp(editor: Editor): Command {
  return function (state, dispatch) {
    if (!editor.view) return false;
    const listItemInfo = findCurrListItem(state);
    if (!listItemInfo) {
      return false;
    }

    const blockId = listItemInfo.node.attrs.blockId as BlockId;
    if (!blockId) return false;

    const blockNode = getBlockNode(editor.app, blockId);
    if (!blockNode) return false;

    const index = blockNode.index()!;
    if (index === 0) return false; // 已经是第一个块

    withTx(editor.app, (tx) => {
      const parentId = tx.getParentId(blockId)!;
      tx.moveBlock(blockId, parentId, index - 1);
      tx.setOrigin("localEditorStructural");
    });

    return true;
  };
}

export function moveBlockDown(editor: Editor): Command {
  return function (state, dispatch) {
    if (!editor.view) return false;
    const listItemInfo = findCurrListItem(state);
    if (!listItemInfo) {
      return false;
    }

    const blockId = listItemInfo.node.attrs.blockId as BlockId;
    if (!blockId) return false;

    const blockNode = getBlockNode(editor.app, blockId);
    if (!blockNode) return false;

    const index = blockNode.index()!;
    const parentNode = blockNode.parent()!;
    if (index >= parentNode.children()!.length - 1) return false; // 已经是最后一个块

    withTx(editor.app, (tx) => {
      const parentId = tx.getParentId(blockId)!;
      tx.moveBlock(blockId, parentId, index + 1);
      tx.setOrigin("localEditorStructural");
    });

    return true;
  };
}

export function mergeWithPreviousBlock(editor: Editor): Command {
  return function (state, dispatch) {
    const { $from, empty } = state.selection;

    // 只在光标位于块开头且没有选中内容时触发
    if (!empty || $from.parentOffset !== 0) return false;

    if (!editor.view) return false;
    const listItemInfo = findCurrListItem(state);
    if (!listItemInfo) return false;

    const { node: currentListItem } = listItemInfo;
    const currentBlockId = currentListItem.attrs.blockId as BlockId;
    if (!currentBlockId) return false;

    const currentBlockNode = getBlockNode(editor.app, currentBlockId);
    if (!currentBlockNode) return false;

    const currentBlockData = getBlockData(editor.app, currentBlockId);
    if (!currentBlockData) return false;

    // 不能合并有子块的块
    const children = currentBlockNode.children();
    if (children && children.length > 0) return false;

    // 找到前一个可以合并的块
    const parentBlockNode = currentBlockNode.parent();
    if (!parentBlockNode) return false; // 根块无法合并

    const siblings = parentBlockNode.children();
    if (!siblings) return false;

    const currentIndex = currentBlockNode.index();
    if (
      currentIndex === null ||
      currentIndex === undefined ||
      currentIndex <= 0
    )
      return false; // 如果是第一个块，无法合并

    // 找到前一个兄弟块（同级别）
    const prevBlockNode = siblings[currentIndex - 1];
    const prevBlockId = prevBlockNode.id;
    const prevBlockData = getBlockData(editor.app, prevBlockId);
    if (!prevBlockData) return false;

    // 只能合并同类型的文本块
    if (prevBlockData.type !== "text" || currentBlockData.type !== "text")
      return false;

    // 前一个块不能有子块
    const prevChildren = prevBlockNode.children();
    if (prevChildren && prevChildren.length > 0) return false;

    // 获取当前块的段落节点
    const currentParagraphNode = currentListItem.firstChild;
    if (!currentParagraphNode) return false;

    // 解析前一个块的内容
    let prevParagraphNode;
    try {
      if (prevBlockData.content && prevBlockData.content.trim() !== "") {
        prevParagraphNode = oldDeserialize(prevBlockData.content);
      } else {
        prevParagraphNode = outlinerSchema.nodes.paragraph.create();
      }
    } catch (error) {
      // 如果解析失败，创建包含纯文本的段落
      const prevTextContent = getTextContent(editor.app, prevBlockId);
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

    withTx(editor.app, (tx) => {
      // 1. 更新前一个块的内容为合并后的内容
      tx.updateBlock(prevBlockId, { content: mergedSerialized });
      // 2. 删除当前块
      tx.deleteBlock(currentBlockId);
      // 3. 设置光标位置
      const selection = {
        editorId: editor.id,
        blockId: prevBlockId,
        anchor: mergePoint,
      };
      tx.setSelection(selection);
      tx.setOrigin("localEditorStructural");
    });

    return true;
  };
}

/**
 * - h|<file> 这种情况下按 backspace ProseMirror 无法正常删除 h
 * 因此我们手工删掉 h，然后聚焦到 file
 */
export function backspaceAfterCharBeforeExpandedFile(): Command {
  return function (state, dispatch) {
    const { $to } = state.selection as NodeSelection;
    const afterNode = $to.nodeAfter;

    if (afterNode && afterNode.type === outlinerSchema.nodes.file) {
      const offset = $to.parentOffset;
      if (offset === 1) {
        let tr = state.tr.replaceWith($to.pos - 1, $to.pos + 1, afterNode);
        tr = tr.setSelection(NodeSelection.create(tr.doc, $to.pos - 1));
        dispatch && dispatch(tr);
        return true;
      }
    }

    return false;
  };
}

/**
 * 在 - |h<file> 这种情况下按 delete ProseMirror 无法正常删除 h
 * 因此我们手工删掉 h，然后聚焦到 file
 */
export function deleteBeforeCharBeforeExpandedFile(): Command {
  return function (state, dispatch) {
    const { empty, $from } = state.selection as NodeSelection;
    if (empty) {
      const $afterFrom = state.doc.resolve($from.pos + 1);
      const afterNode = $afterFrom.nodeAfter;

      if (afterNode && afterNode.type === outlinerSchema.nodes.file) {
        let tr = state.tr.replaceWith($from.pos, $from.pos + 2, afterNode);
        tr = tr.setSelection(NodeSelection.create(tr.doc, $from.pos));
        dispatch && dispatch(tr);
        return true;
      }
    } else {
      return backspaceAfterCharBeforeExpandedFile()(state, dispatch);
    }

    return false;
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
export function codeblockSelectAll(editor: Editor): Command {
  return function (state, dispatch) {
    if (!editor.view) return false;
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
export function codeblockMoveToLineStart(editor: Editor): Command {
  return function (state, dispatch) {
    if (!editor.view) return false;
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
    // const canUndo = canUndoImpl(editor);
    // if (dispatch && canUndo) undoImpl(editor);
    // return canUndo;
    return false; // TODO
  };
}

export function redo(editor: Editor): Command {
  return function (state, dispatch) {
    // const canRedo = canRedoImpl(editor);
    // if (dispatch && canRedo) redoImpl(editor);
    // return canRedo;
    return false; // TODO
  };
}

export function insertLineBreak(): Command {
  return function (state, dispatch) {
    if (dispatch) {
      const lineBreak = outlinerSchema.nodes.lineBreak.create();
      const tr = state.tr.replaceSelectionWith(lineBreak);
      dispatch(tr);
    }
    return true;
  };
}

export const IMAGE_RESIZE_MARK = "IMAGE_RESIZE_MARK";
export function setImageWidth(pos: number, width: number): Command {
  return function (state, dispatch) {
    const fileType = outlinerSchema.nodes.file;
    const node = state.doc.nodeAt(pos);
    if (!node || node.type !== fileType) return false;

    // 更新文件节点的 extraInfo
    const newExtraInfo = JSON.stringify({
      ...JSON.parse(node.attrs.extraInfo || "{}"),
      width,
    });
    const newAttrs = {
      ...node.attrs,
      extraInfo: newExtraInfo,
    };

    if (dispatch) {
      let tr = state.tr.setNodeMarkup(pos, undefined, newAttrs);
      tr = tr.setMeta(IMAGE_RESIZE_MARK, true);
      dispatch(tr);
    }

    return true;
  };
}

export async function uploadFile(editor: Editor, getFile: () => Promise<File>) {
  const { view, app } = editor;
  if (!view) return;
  if (!app.attachmentStorage) {
    toast.error("未配置附件存储，无法上传文件");
    return;
  }

  // 获得要上传的文件
  const file = await getFile();

  // 检查当前是否在列表项中
  const currListItem = findCurrListItem(view.state);
  if (!currListItem) return;

  // 当任务创建时插入文件节点
  let taskId: string | null = null;
  const fileType = outlinerSchema.nodes.file;
  const onTaskCreated = (task: AttachmentTaskInfo) => {
    // 开始执行就立刻移除监听器，确保只执行一次
    editor.app.attachmentStorage?.off("task:created", onTaskCreated);

    // 记录任务 ID，用于后续的文件节点更新
    taskId = task.id;

    // 插入 inline 文件节点，状态为 uploading-0
    const tr = view.state.tr;
    const fileNode = fileType.create({
      path: task.path,
      displayMode: getFileDisplayMode(getFileType(task.filename)), // 使用默认值，后续可以优化
      filename: task.filename,
      type: getFileType(task.path),
      size: task.size,
      status: "uploading-0",
    });
    tr.replaceSelectionWith(fileNode);
    view.dispatch(tr);
  };

  // 注册进度监听器：更新上传进度
  const onTaskProgress = (task: AttachmentTaskInfo) => {
    // 如果任务 ID 不匹配，说明不是当前任务，直接返回
    if (task.id !== taskId) return;

    if (task.progress === undefined) return;

    let found: any = null;

    view.state.doc.descendants((node, pos) => {
      if (found) return false;
      if (node.type === fileType && node.attrs.path === task.path) {
        found = [node, pos];
        return false;
      }
    });

    if (found) {
      const [fileNode, filePos]: [Node, number] = found;
      const newAttrs = {
        ...fileNode.attrs,
        status: `uploading-${Math.round(task.progress)}`,
      };

      const tr = view.state.tr.setNodeMarkup(filePos, undefined, newAttrs);
      view.dispatch(tr);
    }
  };

  // 注册任务完成监听器：更新文件节点的 path 和状态
  const onTaskCompleted = (task: AttachmentTaskInfo) => {
    // 如果任务 ID 不匹配，说明不是当前任务，直接返回
    if (task.id !== taskId) return;

    // 移除监听器
    editor.app.attachmentStorage?.off("task:completed", onTaskCompleted);
    editor.app.attachmentStorage?.off("task:progress", onTaskProgress);

    // 在文档中找到对应的文件节点并更新
    let found: any = null;

    view.state.doc.descendants((node, pos) => {
      if (found) return false;
      if (node.type === fileType && node.attrs.path === task.path) {
        found = [node, pos];
        return false; // 停止遍历
      }
    });

    if (found) {
      const [fileNode, filePos]: [Node, number] = found;
      const currentAttrs = fileNode.attrs as any;
      const newAttrs = {
        ...currentAttrs,
        path: task.path, // 更新为真实的 path
        status: "uploaded",
      };

      const tr = view.state.tr.setNodeMarkup(filePos, undefined, newAttrs);
      view.dispatch(tr);
    }
  };

  // 注册任务失败监听器：更新文件节点状态
  const onTaskFailed = (task: AttachmentTaskInfo) => {
    // 如果任务 ID 不匹配，说明不是当前任务，直接返回
    if (task.id !== taskId) return;

    // 移除监听器
    editor.app.attachmentStorage?.off("task:failed", onTaskFailed);
    editor.app.attachmentStorage?.off("task:progress", onTaskProgress);

    // 在文档中找到对应的文件节点并更新状态
    let found: any = null;

    view.state.doc.descendants((node, pos) => {
      if (found) return false;
      if (node.type === fileType && node.attrs.path === task.path) {
        found = [node, pos];
        return false;
      }
    });

    if (found) {
      const [fileNode, filePos]: [Node, number] = found;
      const newAttrs = {
        ...fileNode.attrs,
        status: "failed-1",
      };

      const tr = view.state.tr.setNodeMarkup(filePos, undefined, newAttrs);
      view.dispatch(tr);
    }
  };

  // 注册所有事件监听器
  editor.app.attachmentStorage?.on("task:created", onTaskCreated);
  editor.app.attachmentStorage?.on("task:completed", onTaskCompleted);
  editor.app.attachmentStorage?.on("task:failed", onTaskFailed);
  editor.app.attachmentStorage?.on("task:progress", onTaskProgress);

  // 直接上传文件，不需要确认对话框
  const attachment = useAttachment(editor.app);
  await attachment.upload(file, false);
}

export function changeFileDisplayMode(
  pos: number,
  displayMode: string
): Command {
  return function (state, dispatch) {
    const node = state.doc.nodeAt(pos);
    const fileType = outlinerSchema.nodes.file;
    if (!node || node.type !== fileType) return false;

    const newAttrs = {
      ...node.attrs,
      displayMode,
    };

    if (dispatch) {
      const tr = state.tr.setNodeMarkup(pos, undefined, newAttrs);
      dispatch(tr);
    }
    return true;
  };
}
