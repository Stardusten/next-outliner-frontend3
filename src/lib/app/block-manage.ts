import type { Frontiers } from "loro-crdt";
import type { App } from "./app";
import type {
  BlockData,
  BlockDataInner,
  BlockId,
  BlockNode,
} from "../common/types";

export function getRootBlockNodes(app: App) {
  return app.tree.roots();
}

export function getRootBlockIds(app: App) {
  return app.tree.roots().map((node) => node.id);
}

/**
 * 根据 ID 获取块节点
 * @param id 块 ID
 * @param allowDeleted 是否允许获取已删除的块
 */
export function getBlockNode(
  app: App,
  id: BlockId,
  allowDeleted = false,
  vv?: Frontiers
) {
  if (vv) {
    try {
      app.doc.checkout(vv);
      const node = app.tree.getNodeByID(id);
      if (!node || (!allowDeleted && node.isDeleted())) return null;
      return node;
    } finally {
      app.doc.checkoutToLatest();
    }
  } else {
    const node = app.tree.getNodeByID(id);
    if (!node || (!allowDeleted && node.isDeleted())) return null;
    return node;
  }
}

/**
 * 获取从根块到指定块的完整路径
 * @param blockId 目标块的 ID
 * @returns 返回从根块到目标块的完整路径数组，包含目标块本身。
 * 数组顺序是从根块开始，到目标块结束。如果块不存在则返回 null。
 * 例如: [rootId, parent2Id, parent1Id, blockId]
 */
export function getBlockPath(app: App, blockId: BlockId): BlockId[] | null {
  const targetNode = getBlockNode(app, blockId);
  if (!targetNode) return null;

  // 从目标块向上遍历，收集所有祖先块的 ID
  const path: BlockId[] = [blockId];
  let curr = targetNode.parent();

  while (curr != null) {
    path.unshift(curr.id);
    curr = curr.parent();
  }

  return path;
}

export function getBlockDataMap(
  app: App,
  id: BlockId,
  allowDeleted = false,
  vv?: Frontiers
): BlockData | null {
  const node = getBlockNode(app, id, allowDeleted, vv);
  if (!node) return null;
  return node.data as BlockData;
}

export function getBlockData(
  app: App,
  id: BlockId,
  allowDeleted = false,
  vv?: Frontiers
): BlockDataInner | null {
  const node = getBlockNode(app, id, allowDeleted, vv);
  if (!node) return null;
  return node.data.toJSON() as BlockDataInner;
}

export function getAllNodes(app: App, withDeleted = false): BlockNode[] {
  return app.tree.getNodes({ withDeleted });
}
