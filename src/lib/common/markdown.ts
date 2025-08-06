import type { App } from "../app/app";
import { getBlockNode } from "../app/block-manage";
import { getTextContent } from "../app/index/text-content";
import type { BlockId, BlockNode } from "./types";

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
