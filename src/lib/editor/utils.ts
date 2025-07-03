import { Node } from "prosemirror-model";
import type { EditorState, Transaction } from "prosemirror-state";
import { TextSelection } from "prosemirror-state";
import { outlinerSchema } from "./schema";
import type {
  BlockDataInner,
  BlockId,
  BlockNode,
  BlockType,
} from "../common/types";
import type { App } from "../app/app";
import { getTextContent } from "../app/index/text-content";
import { getBlockNode, getRootBlockNodes } from "../app/block-manage";

/**
 * 将当前文档转换为 Markdown
 */
export function toMarkdown(doc: Node): string {
  const listItemType = outlinerSchema.nodes.listItem;
  if (listItemType == null) {
    throw new Error("Invalid schema, listItem type is not defined");
  }

  const lines: string[] = [];
  doc.content.forEach((node) => {
    if (node.type === listItemType) {
      const level = node.attrs.level;
      const content = node.textContent;
      lines.push("  ".repeat(level) + "- " + content);
    } else {
      throw new Error(
        "Invalid document, unexpected node type: " + node.type.name
      );
    }
  });

  return lines.join("\n");
}

export function oldSerialize(doc: Node): string {
  return JSON.stringify(doc.toJSON());
}

export function oldDeserialize(repr: string): Node {
  try {
    const json = JSON.parse(repr);
    return outlinerSchema.nodeFromJSON(json);
  } catch (error) {
    // 如果反序列化失败，返回一个空的段落节点
    console.warn(
      "Failed to deserialize content. content=",
      repr,
      "error=",
      error
    );
    return outlinerSchema.nodes.paragraph.create();
  }
}

export function serialize(node: Node): {
  type: BlockType;
  content: string;
} {
  const paragraphNodeType = outlinerSchema.nodes.paragraph;
  const codeblockNodeType = outlinerSchema.nodes.codeblock;
  const fileNodeType = outlinerSchema.nodes.file;

  if (node.type === paragraphNodeType) {
    return {
      type: "text",
      content: JSON.stringify(node.toJSON()),
    };
  } else if (node.type === codeblockNodeType) {
    return {
      type: "code",
      // 这里我们不是直接将 codeblockNode.textContent 放到 content
      // 因为我们希望代码块里不仅有代码，还应该能有 marks 和块引用等东西
      content: JSON.stringify(node.toJSON()),
    };
  }

  console.warn("Invalid listItemNode, unexpected node type: " + node.type.name);
  return { type: "text", content: "" };
}

export function deserialize(
  blockNode: BlockNode,
  level?: number,
  storage?: App,
  overrideAttrs?: Record<string, any>
): Node {
  // 使用反序列化来创建段落内容
  let listItemNode: Node | null = null;
  const listItemType = outlinerSchema.nodes.listItem;
  const paragraphType = outlinerSchema.nodes.paragraph;
  const blockData = blockNode.data.toJSON() as BlockDataInner;
  const children = blockNode.children();
  const hasChildren = children != null && children.length > 0;

  level ??= 0;

  try {
    if (blockData.content && blockData.content.trim() !== "") {
      if (blockData.type === "text") {
        const json = JSON.parse(blockData.content);
        const paragraphNode = outlinerSchema.nodeFromJSON(json);
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
        const codeblockNode = outlinerSchema.nodeFromJSON(json);
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
      }
    }
  } catch (error) {
    // 如果反序列化失败，尝试使用纯文本内容创建段落节点
    console.warn("Failed to deserialize block content");
    const textContent = storage ? getTextContent(storage, blockNode.id) : "";
    const paragraphNode = paragraphType.create(
      null,
      textContent ? [outlinerSchema.text(textContent)] : []
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

export function createStateFromStorage(
  storage: App,
  rootBlockIds: BlockId[],
  rootOnly: boolean = false
): Node {
  const {
    listItem: listItemType,
    paragraph: paragraphType,
    doc: docType,
  } = outlinerSchema.nodes;

  // 将嵌套的 block 转换为扁平的 listItem 节点数组
  function flattenBlocks(blockNodes: BlockNode[], level: number): Node[] {
    const nodes: Node[] = [];

    for (const blockNode of blockNodes) {
      const blockData = blockNode.data.toJSON() as BlockDataInner;
      const children = blockNode.children();
      const hasChildren = children != null && children.length > 0;
      nodes.push(deserialize(blockNode, level, storage));

      // 如果块有子节点且未被折叠，并且 rootOnly 为 false，则递归渲染子节点
      if (!rootOnly && hasChildren && !blockData.folded) {
        const childNodes = flattenBlocks(children, level + 1);
        nodes.push(...childNodes);
      }
    }

    return nodes;
  }

  // 获取根块的 BlockNode 对象
  let rootBlocks: BlockNode[];
  if (rootBlockIds.length > 0) {
    rootBlocks = rootBlockIds
      .map((id) => getBlockNode(storage, id))
      .filter((b): b is BlockNode => b !== null);
  } else {
    rootBlocks = getRootBlockNodes(storage);
  }

  const flatNodes = flattenBlocks(rootBlocks, 0);

  // 创建文档节点
  return docType.create(null, flatNodes);
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
    if (node.type.name === "listItem") {
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
