import { Node, Schema } from "@tiptap/pm/model";
import type { BlockId, BlockType } from "../common/types";
import { detachedSchema } from "./schema";

/**
 * @param contentNode Paragraph、Codeblock 是内容节点
 */
export function contentNodeToStr(contentNode: Node): string {
  return JSON.stringify(contentNode.toJSON());
}

export function str2ContentNode(schema: Schema, str: string): Node {
  try {
    const json = JSON.parse(str);
    return schema.nodeFromJSON(json);
  } catch (error) {
    // 如果反序列化失败，返回一个空的段落节点
    console.warn(
      "Failed to deserialize content. content=",
      str,
      "error=",
      error
    );
    return schema.nodes.paragraph.create();
  }
}

export function contentNodeToStrAndType(node: Node): {
  type: BlockType;
  content: string;
} {
  const paragraph = detachedSchema.nodes.paragraph;
  const codeblock = detachedSchema.nodes.codeblock;
  const search = detachedSchema.nodes.search;

  const type =
    node.type.name === paragraph.name
      ? "text"
      : node.type.name === codeblock.name
        ? "code"
        : node.type.name === search.name
          ? "search"
          : "text";
  const content = contentNodeToStr(node);
  return { type: "text", content };
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
