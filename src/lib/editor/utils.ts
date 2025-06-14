import { keymap } from "prosemirror-keymap";
import { Node, Schema, type NodeSpec } from "prosemirror-model";
import type { Command, EditorState } from "prosemirror-state";
import { EditorState as ProseMirrorState } from "prosemirror-state";
import type { Block, BlockId, BlockLoaded } from "../blocks/types";
import type { BlockStorage } from "../storage/interface";
import { outlinerSchema } from "./schema";

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
      throw new Error("Invalid document, unexpected node type: " + node.type.name);
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
    console.warn("Failed to deserialize content. content=", repr, "error=", error);
    return outlinerSchema.nodes.paragraph.create();
  }
}

export function serialize(listItemNode: Node): {
  type: Block["type"];
  content: string;
  textContent: string;
} {
  const listItemType = outlinerSchema.nodes.listItem;
  if (listItemNode.type !== listItemType) {
    throw new Error("Invalid document, unexpected node type: " + listItemNode.type.name);
  }

  const type = listItemNode.attrs.type;
  if (type === "text") {
    const paragraphNode = listItemNode.firstChild;
    if (paragraphNode) {
      return {
        type: "text",
        content: JSON.stringify(paragraphNode.toJSON()),
        textContent: paragraphNode.textContent,
      };
    }
  } else if (type === "code") {
    const codeblockNode = listItemNode.firstChild;
    if (codeblockNode) {
      return {
        type: "code",
        // 这里我们不是直接将 codeblockNode.textContent 放到 content
        // 因为我们希望代码块里不仅有代码，还应该能有 marks 和块引用等东西
        content: JSON.stringify(codeblockNode.toJSON()),
        textContent: codeblockNode.textContent,
      };
    }
  }

  console.warn("Invalid listItemNode, unexpected node type: " + listItemNode.type.name);
  return { type: "text", content: "", textContent: "" };
}

export function deserialize(block: BlockLoaded, level?: number): Node {
  // 使用反序列化来创建段落内容
  let listItemNode: Node | null = null;
  const listItemType = outlinerSchema.nodes.listItem;
  const paragraphType = outlinerSchema.nodes.paragraph;
  const blockData = block.get();
  const hasChildren = blockData.childrenBlocks.length > 0;

  level ??= 0;

  try {
    if (blockData.content && blockData.content.trim() !== "") {
      if (blockData.type === "text") {
        const json = JSON.parse(blockData.content);
        const paragraphNode = outlinerSchema.nodeFromJSON(json);
        listItemNode = listItemType.create(
          { level, blockId: blockData.id, folded: blockData.folded, hasChildren, type: "text" },
          paragraphNode,
        );
      } else if (blockData.type === "code") {
        const json = JSON.parse(blockData.content);
        const codeblockNode = outlinerSchema.nodeFromJSON(json);
        listItemNode = listItemType.create(
          { level, blockId: blockData.id, folded: blockData.folded, hasChildren, type: "code" },
          codeblockNode,
        );
      }
    }
  } catch (error) {
    // 如果反序列化失败，尝试使用纯文本内容创建段落节点
    console.warn("Failed to deserialize block content");
    const paragraphNode = paragraphType.create(
      null,
      blockData.textContent ? [outlinerSchema.text(blockData.textContent)] : [],
    );
    listItemNode = listItemType.create(
      { level, blockId: blockData.id, folded: blockData.folded, hasChildren, type: "text" },
      paragraphNode,
    );
  }

  // 如果没有内容，创建空段落
  if (!listItemNode) {
    listItemNode = listItemType.create(
      { level, blockId: blockData.id, folded: blockData.folded, hasChildren, type: "text" },
      paragraphType.create(null, []),
    );
  }

  return listItemNode;
}

export function createStateFromStorage(storage: BlockStorage, rootBlockIds: BlockId[]): Node {
  const { listItem: listItemType, paragraph: paragraphType, doc: docType } = outlinerSchema.nodes;

  // 将嵌套的 block 转换为扁平的 listItem 节点数组
  function flattenBlocks(blocks: BlockLoaded[], level: number): Node[] {
    const nodes: Node[] = [];

    for (const blockLoaded of blocks) {
      const blockData = blockLoaded.get();
      const hasChildren = blockData.childrenBlocks.length > 0;
      nodes.push(deserialize(blockLoaded, level));

      // 如果块有子节点且未被折叠，则递归渲染子节点
      if (hasChildren && !blockData.folded) {
        const childNodes = flattenBlocks(blockData.childrenBlocks, level + 1);
        nodes.push(...childNodes);
      }
    }

    return nodes;
  }

  // 获取根块的 BlockLoaded 对象
  let rootBlocks: BlockLoaded[];
  if (rootBlockIds.length > 0) {
    // 只在这里使用 storage.getBlock，之后完全依赖缓存属性
    rootBlocks = rootBlockIds
      .map((id) => storage.getBlock(id))
      .filter((b): b is BlockLoaded => b !== null);
  } else {
    rootBlocks = storage.getRootBlocks();
  }

  const flatNodes = flattenBlocks(rootBlocks, 0);

  // 创建文档节点
  return docType.create(null, flatNodes);
}

/**
 * 将相对位置（块 ID + 块内偏移）转换为绝对位置（相对文档开头的偏移）
 */
export function getAbsPos(doc: Node, blockId: BlockId, offset: number): number | null {
  let absolutePos: number | null = null;
  doc.descendants((node, pos) => {
    if (absolutePos !== null) return false; // 已找到，停止搜索

    if (node.type.name === "listItem" && node.attrs.blockId === blockId) {
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
