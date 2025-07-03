import type {
  BlockNode,
  BlockData,
  BlockId,
  BlockDataInner,
} from "../common/types";
import type { App } from "./app";
import { getBlockNode } from "./block-manage";

function _insertBlockAfter(app: App) {
  return function (
    afterNode: BlockNode,
    dataSetter: (data: BlockData) => void
  ) {
    const parentNode = afterNode.parent();
    const index = afterNode.index()!;
    const newNode =
      parentNode == null
        ? app.tree.createNode(undefined, index + 1) // 创建新的根块
        : parentNode.createNode(index + 1); // 非根块
    dataSetter(newNode.data as BlockData);
    return newNode;
  };
}

function insertBlockAfter(app: App) {
  return function (
    after: BlockId | BlockNode,
    dataSetter: (data: BlockData) => void
  ) {
    if (typeof after === "string") {
      const afterNode = getBlockNode(app, after);
      if (!afterNode) throw new Error(`after 块 ${after} 不存在`);
      return _insertBlockAfter(app)(afterNode, dataSetter);
    } else {
      return _insertBlockAfter(app)(after, dataSetter);
    }
  };
}

function _insertBlockBefore(app: App) {
  return function (
    beforeNode: BlockNode,
    dataSetter: (data: BlockData) => void
  ) {
    const parentNode = beforeNode.parent();
    const index = beforeNode.index()!;
    const newNode =
      parentNode == null
        ? app.tree.createNode(undefined, index) // 创建新的根块
        : parentNode.createNode(index); // 非根块
    dataSetter(newNode.data as BlockData);
    return newNode;
  };
}

function insertBlockBefore(app: App) {
  return function (
    before: BlockId | BlockNode,
    dataSetter: (data: BlockData) => void
  ) {
    if (typeof before === "string") {
      const beforeNode = getBlockNode(app, before);
      if (!beforeNode) throw new Error(`before 块 ${before} 不存在`);
      return _insertBlockBefore(app)(beforeNode, dataSetter);
    } else {
      return _insertBlockBefore(app)(before, dataSetter);
    }
  };
}

function _insertBlockUnder(app: App) {
  return function (
    underNode: BlockNode | null,
    dataSetter: (data: BlockData) => void,
    index?: number
  ) {
    const newNode =
      underNode == null
        ? app.tree.createNode(undefined, index)
        : underNode.createNode(index);
    dataSetter(newNode.data as BlockData);
    return newNode;
  };
}

function insertBlockUnder(app: App) {
  return function (
    under: BlockId | BlockNode | null,
    dataSetter: (data: BlockData) => void,
    index?: number
  ) {
    if (under == null) {
      return _insertBlockUnder(app)(null, dataSetter, index);
    } else if (typeof under === "string") {
      const underNode = getBlockNode(app, under);
      if (!underNode) throw new Error(`under 块 ${under} 不存在`);
      return _insertBlockUnder(app)(underNode, dataSetter, index);
    } else {
      return _insertBlockUnder(app)(under, dataSetter, index);
    }
  };
}

function _deleteBlock(app: App) {
  return function (targetNode: BlockNode) {
    app.tree.delete(targetNode.id);
  };
}

function deleteBlock(app: App) {
  return function (target: BlockId | BlockNode) {
    if (typeof target === "string") {
      const targetNode = getBlockNode(app, target);
      if (!targetNode) throw new Error(`target 块 ${target} 不存在`);
      return _deleteBlock(app)(targetNode);
    } else {
      return _deleteBlock(app)(target);
    }
  };
}

function _demoteBlock(app: App) {
  return function (targetNode: BlockNode) {
    const parentNode = targetNode.parent();
    const index = targetNode.index()!;
    if (index === 0) {
      throw new Error(`target 块 ${targetNode.id} 是第一个块，不能缩进`);
    }
    const prevNode = parentNode
      ? parentNode.children()![index - 1]
      : app.tree.roots()[index - 1];
    app.tree.move(targetNode.id, prevNode.id);
  };
}

function demoteBlock(app: App) {
  return function (target: BlockId | BlockNode) {
    if (typeof target === "string") {
      const targetNode = getBlockNode(app, target);
      if (!targetNode) throw new Error(`target 块 ${target} 不存在`);
      return _demoteBlock(app)(targetNode);
    } else {
      return _demoteBlock(app)(target);
    }
  };
}

function _promoteBlock(app: App) {
  return function (targetNode: BlockNode) {
    const parentNode = targetNode.parent();
    if (!parentNode)
      throw new Error(`target 块 ${targetNode.id} 没有父节点，根块不能反缩进`);
    const parentIndex = parentNode.index()!;
    const grandParentNode = parentNode.parent();
    if (!grandParentNode) {
      app.tree.move(targetNode.id, undefined, parentIndex + 1);
    } else {
      app.tree.move(targetNode.id, grandParentNode.id, parentIndex + 1);
    }
  };
}

function promoteBlock(app: App) {
  return function (target: BlockId | BlockNode) {
    if (typeof target === "string") {
      const targetNode = getBlockNode(app, target);
      if (!targetNode) throw new Error(`target 块 ${target} 不存在`);
      return _promoteBlock(app)(targetNode);
    } else {
      return _promoteBlock(app)(target);
    }
  };
}

function _toggleFold(app: App) {
  return function (targetNode: BlockNode, folded?: boolean) {
    const currState = targetNode.data.get("folded");
    const newState = folded === undefined ? !currState : folded;
    if (newState === currState) return;
    targetNode.data.set("folded", newState);
  };
}

function toggleFold(app: App) {
  return function (target: BlockId | BlockNode, folded?: boolean) {
    if (typeof target === "string") {
      const targetNode = getBlockNode(app, target);
      if (!targetNode) throw new Error(`target 块 ${target} 不存在`);
      return _toggleFold(app)(targetNode, folded);
    } else {
      return _toggleFold(app)(target, folded);
    }
  };
}

function _updateBlockData(app: App) {
  return function (
    targetNode: BlockNode,
    patch: Partial<Omit<BlockDataInner, "fold">>
  ) {
    for (const [key, value] of Object.entries(patch)) {
      // @ts-ignore - keyof 细节
      targetNode.data.set(key as any, value);
    }
  };
}

function updateBlockData(app: App) {
  return function (
    target: BlockId | BlockNode,
    patch: Partial<Omit<BlockDataInner, "fold">>
  ) {
    if (typeof target === "string") {
      const targetNode = getBlockNode(app, target);
      if (!targetNode) throw new Error(`target 块 ${target} 不存在`);
      return _updateBlockData(app)(targetNode, patch);
    } else {
      return _updateBlockData(app)(target, patch);
    }
  };
}

function _moveBlock(app: App) {
  return function (
    targetNode: BlockNode,
    newParent: BlockNode | null,
    index?: number
  ) {
    if (targetNode.parent() == null) {
      throw new Error(`不允许移动根块 ${targetNode.id}`);
    }
    app.tree.move(targetNode.id, newParent?.id, index);
  };
}

function moveBlock(app: App) {
  return function (
    target: BlockId | BlockNode,
    newParent: BlockId | BlockNode | null,
    index?: number
  ) {
    const targetNode =
      typeof target === "string" ? getBlockNode(app, target) : target;
    if (!targetNode) {
      throw new Error(
        `target 块 ${target} 或 newParent 块 ${newParent} 不存在`
      );
    }
    const newParentNode =
      typeof newParent === "string" ? getBlockNode(app, newParent) : newParent;
    return _moveBlock(app)(targetNode, newParentNode, index);
  };
}

export {
  insertBlockAfter,
  insertBlockBefore,
  insertBlockUnder,
  deleteBlock,
  demoteBlock,
  promoteBlock,
  toggleFold,
  updateBlockData,
  moveBlock,
};
