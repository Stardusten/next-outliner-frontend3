import { Node } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { TextSelection } from "@tiptap/pm/state";
import type { App } from "../app/app";
import { getBlockNode } from "../app/block-manage";
import { getTextContent } from "../app/index/text-content";
import type {
  BlockDataInner,
  BlockId,
  BlockNode,
  BlockType,
} from "../common/types";
import { schema } from "./tiptap-editor/editor-view";
import { Codeblock } from "./tiptap-editor/nodes/codeblock";
import { ListItem } from "./tiptap-editor/nodes/list-item";
import { Paragraph } from "./tiptap-editor/nodes/paragraph";
import { Search } from "./tiptap-editor/nodes/search";

export function toMarkdown(app: App, rootBlockIds: BlockId[]): string {
  const recur = (rootBlockNode: BlockNode, level: number) => {
    const textContent = getTextContent(app, rootBlockNode.id);
    lines.push("  ".repeat(level) + "- " + textContent);

    // 递归处理子节点
    for (const child of rootBlockNode.children() ?? []) {
      recur(child, level + 1);
    }
  };

  const lines: string[] = [];
  for (const rootBlockId of rootBlockIds) {
    const rootBlockNode = getBlockNode(app, rootBlockId);
    if (rootBlockNode == null) {
      throw new Error("Block not found: " + rootBlockId);
    }
    recur(rootBlockNode, 0);
  }
  return lines.join("\n");
}

export function oldSerialize(doc: Node): string {
  return JSON.stringify(doc.toJSON());
}

export function oldDeserialize(repr: string): Node {
  try {
    const json = JSON.parse(repr);
    return schema.nodeFromJSON(json);
  } catch (error) {
    // 如果反序列化失败，返回一个空的段落节点
    console.warn(
      "Failed to deserialize content. content=",
      repr,
      "error=",
      error
    );
    return schema.nodes.paragraph.create();
  }
}

export function serialize(node: Node): {
  type: BlockType;
  content: string;
} {
  const paragraphNodeType = schema.nodes.paragraph;
  const codeblockNodeType = schema.nodes.codeblock;
  const searchNodeType = schema.nodes.search;

  if (node.type.name === Paragraph.name) {
    return {
      type: "text",
      content: JSON.stringify(node.toJSON()),
    };
  } else if (node.type.name === Codeblock.name) {
    return {
      type: "code",
      // 这里我们不是直接将 codeblockNode.textContent 放到 content
      // 因为我们希望代码块里不仅有代码，还应该能有 marks 和块引用等东西
      content: JSON.stringify(node.toJSON()),
    };
  } else if (node.type.name === Search.name) {
    return {
      type: "search",
      content: JSON.stringify(node.toJSON()),
    };
  }

  console.warn("Invalid listItemNode, unexpected node type: " + node.type.name);
  return { type: "text", content: "" };
}

/**
 * @deprecated 别用，schema 是错误的
 */
export function listItemNodeFromBlockNode(
  blockNode: BlockNode,
  level?: number,
  app?: App,
  overrideAttrs?: Record<string, any>
): Node {
  // 使用反序列化来创建段落内容
  let listItemNode: Node | null = null;
  const listItemType = schema.nodes.listItem;
  const paragraphType = schema.nodes.paragraph;
  const blockData = blockNode.data.toJSON() as BlockDataInner;
  const children = blockNode.children();
  const hasChildren = children != null && children.length > 0;

  level ??= 0;

  try {
    if (blockData.content && blockData.content.trim() !== "") {
      if (blockData.type === "text") {
        const json = JSON.parse(blockData.content);
        const paragraphNode = schema.nodeFromJSON(json);
        listItemNode = listItemType.create(
          {
            level,
            blockId: blockNode.id,
            folded: blockData.folded,
            hasChildren,
            type: "text",
            ...overrideAttrs,
          },
          paragraphNode
        );
      } else if (blockData.type === "code") {
        const json = JSON.parse(blockData.content);
        const codeblockNode = schema.nodeFromJSON(json);
        listItemNode = listItemType.create(
          {
            level,
            blockId: blockNode.id,
            folded: blockData.folded,
            hasChildren,
            type: "code",
            ...overrideAttrs,
          },
          codeblockNode
        );
      } else if (blockData.type === "search") {
        const json = JSON.parse(blockData.content);
        const searchNode = schema.nodeFromJSON(json);
        listItemNode = listItemType.create(
          {
            level,
            blockId: blockNode.id,
            folded: blockData.folded,
            hasChildren,
            type: "search",
            ...overrideAttrs,
          },
          searchNode
        );
      }
    }
  } catch (error) {
    // 如果反序列化失败，尝试使用纯文本内容创建段落节点
    console.warn("Failed to deserialize block content");
    const textContent = app ? getTextContent(app, blockNode.id) : "";
    const paragraphNode = paragraphType.create(
      null,
      textContent ? [schema.text(textContent)] : []
    );
    listItemNode = listItemType.create(
      {
        level,
        blockId: blockNode.id,
        folded: blockData.folded,
        hasChildren,
        type: "text",
        ...overrideAttrs,
      },
      paragraphNode
    );
  }

  // 如果没有内容，创建空段落
  if (!listItemNode) {
    listItemNode = listItemType.create(
      {
        level,
        blockId: blockNode.id,
        folded: blockData.folded,
        hasChildren,
        type: "text",
      },
      paragraphType.create(null, [])
    );
  }

  return listItemNode;
}

/**
 *  查找包含给定文档位置的 listItem 节点
 * @param doc Prosemirror 文档
 * @param pos 文档中的绝对位置
 */
export function findListItemAtPos(doc: Node, pos: number) {
  const $pos = doc.resolve(pos);
  for (let i = $pos.depth; i > 0; i--) {
    const node = $pos.node(i);
    if (node.type.name === ListItem.name) {
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

export function buildBlockRefStr(blockId: BlockId) {
  return `block-id:${blockId}`;
}

export function parseBlockRefStr(str: string) {
  const prefix = "block-id:";
  if (str.startsWith(prefix)) {
    return str.slice(prefix.length);
  }
  return null;
}

/**
 * 规范化选区，保证选区选中的都是整个块，不会只选中一个块的某个部分
 */
export function normalizeSelection(tr: Transaction): Transaction {
  const { $anchor, $head, empty } = tr.selection;

  // 空选区不需要标准化
  if (empty) return tr;

  const anchorListItem = findListItemAtPos(tr.doc, $anchor.pos);
  const headListItem = findListItemAtPos(tr.doc, $head.pos);
  if (!anchorListItem || !headListItem) return tr;

  // 选区开始和结束不是同一个 listItem
  // 正向选择，即从前往后选
  if (anchorListItem.pos < headListItem.pos) {
    const newAnchor = anchorListItem.pos + 2;
    const newHead = headListItem.pos + headListItem.node.nodeSize - 2;

    // 需要改变选区
    if ($anchor.pos !== newAnchor || $head.pos !== newHead) {
      const newSelection = TextSelection.create(tr.doc, newAnchor, newHead);
      return tr.setSelection(newSelection);
    } else return tr;
  } else if (anchorListItem.pos > headListItem.pos) {
    // 逆向选择，即从后往前选
    const newAnchor = anchorListItem.pos + anchorListItem.node.nodeSize - 2;
    const newHead = headListItem.pos + 2;

    // 需要改变选区
    if ($anchor.pos !== newAnchor || $head.pos !== newHead) {
      const newSelection = TextSelection.create(tr.doc, newAnchor, newHead);
      return tr.setSelection(newSelection);
    } else return tr;
  }
  return tr;
}

export function buildTextContent(s: string) {
  const textNode = s === "" ? undefined : schema.text(s);
  const paragraphNode = schema.nodes.paragraph.create({}, textNode);
  return serialize(paragraphNode);
}

export const clipboard = {
  writeText(text: string) {
    navigator.clipboard.writeText(text);
  },
  readText() {
    return navigator.clipboard.readText();
  },
};
