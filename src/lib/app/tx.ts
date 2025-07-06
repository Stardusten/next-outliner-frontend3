import { txOriginToString } from "../common/origin-utils";
import { AsyncTaskQueue } from "../common/taskQueue";
import type {
  BlockData,
  BlockDataInner,
  BlockId,
  SelectionInfo,
  TxOrigin,
} from "../common/types";
import { getEditorSelectionInfo } from "../editor/editor";
import type { App } from "./app";
import {
  deleteBlock,
  demoteBlock,
  insertBlockAfter,
  insertBlockBefore,
  insertBlockUnder,
  moveBlock,
  promoteBlock,
  toggleFold,
  updateBlockData,
} from "./commands";
import { getLastFocusedEditor } from "./editors";

export type TxExecutedOperation =
  | {
      type: "block:create";
      blockId: BlockId;
      parent: BlockId | null;
      index: number;
      data: BlockDataInner;
    }
  | {
      type: "block:delete";
      blockId: BlockId;
      oldData: BlockDataInner;
      oldParent: BlockId | null;
      oldIndex: number;
    }
  | {
      type: "block:move";
      blockId: BlockId;
      parent: BlockId | null;
      index: number;
      oldParent: BlockId | null;
      oldIndex: number;
    }
  | {
      type: "block:update";
      blockId: BlockId;
      newData: BlockDataInner;
      oldData: BlockDataInner;
    };

export type TxOpParams =
  | {
      type: "block:create";
      parent: BlockId | null;
      index: number;
      data: BlockDataInner;
    }
  | {
      type: "block:delete";
      blockId: BlockId;
    }
  | {
      type: "block:move";
      blockId: BlockId;
      parent: BlockId | null;
      index: number;
    }
  | {
      type: "block:update";
      blockId: BlockId;
      newData: BlockDataInner;
    };

export type TxMeta = {
  origin: string;
  beforeSelection?: SelectionInfo;
  selection?: SelectionInfo;
};

export type TxStatus = "notCommit" | "pending" | "committed" | "rollbacked";

export type Transaction = {
  ops: TxOpParams[];
  executedOps: TxExecutedOperation[];
  meta: TxMeta;
  status: TxStatus;
};

export type TransactionHandler = {
  createBlock: (
    parent: BlockId | null,
    index: number,
    data: BlockDataInner
  ) => BlockId;
  deleteBlock: (blockId: BlockId) => void;
  moveBlock: (blockId: BlockId, parent: BlockId | null, index: number) => void;
  updateBlock: (blockId: BlockId, newData: BlockDataInner) => void;
  setBeforeSelection: (selection: SelectionInfo) => void;
  setSelection: (selection: SelectionInfo) => void;
  setOrigin: (origin: TxOrigin) => void;
  commit: () => void;
  rollback: () => void;
};

/**
 * 初始化事务管理器
 */
export function initTransactionManager(app: App) {
  app.txQueue = new AsyncTaskQueue();
}

/**
 * 创建事务处理器
 */
function createTransactionHandler(app: App): TransactionHandler {
  const ops: TxOpParams[] = [];
  const executedOps: TxExecutedOperation[] = [];
  let meta: Partial<TxMeta> = {};
  let status: TxStatus = "notCommit";

  let tempIdCounter = 0;

  const generateTempId = (): BlockId => {
    return `temp_${tempIdCounter++}` as BlockId;
  };

  const handler: TransactionHandler = {
    createBlock: (
      parent: BlockId | null,
      index: number,
      data: BlockDataInner
    ): BlockId => {
      if (status !== "notCommit")
        throw new Error(`Transaction already ${status}`);

      ops.push({
        type: "block:create",
        parent,
        index,
        data,
      });
      return generateTempId();
    },

    deleteBlock: (blockId: BlockId): void => {
      if (status !== "notCommit")
        throw new Error(`Transaction already ${status}`);

      ops.push({
        type: "block:delete",
        blockId,
      });
    },

    moveBlock: (
      blockId: BlockId,
      parent: BlockId | null,
      index: number
    ): void => {
      if (status !== "notCommit")
        throw new Error(`Transaction already ${status}`);

      ops.push({
        type: "block:move",
        blockId,
        parent,
        index,
      });
    },

    updateBlock: (blockId: BlockId, newData: BlockDataInner): void => {
      if (status !== "notCommit")
        throw new Error(`Transaction already ${status}`);

      ops.push({
        type: "block:update",
        blockId,
        newData,
      });
    },

    setBeforeSelection: (selection: SelectionInfo): void => {
      meta.beforeSelection = selection;
    },

    setSelection: (selection: SelectionInfo): void => {
      meta.selection = selection;
    },

    setOrigin: (origin: TxOrigin): void => {
      meta.origin = txOriginToString(origin);
    },

    commit: (): void => {
      if (status !== "notCommit") {
        throw new Error(`Transaction already ${status}`);
      }

      status = "pending";

      try {
        // 执行所有操作
        for (const op of ops) {
          switch (op.type) {
            case "block:create": {
              const createFn = insertBlockUnder(app);
              const blockNode = createFn(
                op.parent,
                (dataMap) => {
                  dataMap.set("type", op.data.type);
                  dataMap.set("folded", op.data.folded);
                  dataMap.set("content", op.data.content);
                },
                op.index
              );

              executedOps.push({
                type: "block:create",
                blockId: blockNode.id,
                parent: op.parent,
                index: op.index,
                data: op.data,
              });
              break;
            }

            case "block:delete": {
              // 获取删除前的信息
              const blockNode = app.tree.getNodeByID(op.blockId);
              if (!blockNode) {
                throw new Error(`Block ${op.blockId} not found`);
              }

              const oldParent = blockNode.parent()?.id ?? null;
              const oldIndex = blockNode.index() ?? 0;
              const oldData = blockNode.data.toJSON() as BlockDataInner;

              // 执行删除
              const deleteFn = deleteBlock(app);
              deleteFn(op.blockId);

              executedOps.push({
                type: "block:delete",
                blockId: op.blockId,
                oldData,
                oldParent,
                oldIndex,
              });
              break;
            }

            case "block:move": {
              // 获取移动前的信息
              const blockNode = app.tree.getNodeByID(op.blockId);
              if (!blockNode) {
                throw new Error(`Block ${op.blockId} not found`);
              }

              const oldParent = blockNode.parent()?.id ?? null;
              const oldIndex = blockNode.index() ?? 0;

              // 执行移动
              const moveFn = moveBlock(app);
              moveFn(op.blockId, op.parent, op.index);

              executedOps.push({
                type: "block:move",
                blockId: op.blockId,
                parent: op.parent,
                index: op.index,
                oldParent,
                oldIndex,
              });
              break;
            }

            case "block:update": {
              // 获取更新前的数据
              const blockNode = app.tree.getNodeByID(op.blockId);
              if (!blockNode) {
                throw new Error(`Block ${op.blockId} not found`);
              }

              const oldData = blockNode.data.toJSON() as BlockDataInner;

              // 执行更新
              const updateFn = updateBlockData(app);
              updateFn(op.blockId, op.newData);

              executedOps.push({
                type: "block:update",
                blockId: op.blockId,
                newData: op.newData,
                oldData,
              });
              break;
            }
          }
        }

        status = "committed";
      } catch (error) {
        status = "rollbacked";
        throw error;
      }
    },

    rollback: (): void => {
      if (status !== "notCommit") {
        throw new Error(`Transaction already ${status}`);
      }

      // 清空所有操作
      ops.length = 0;
      executedOps.length = 0;

      status = "rollbacked";
    },
  };

  // 添加内部方法用于获取状态
  (handler as any)._getOps = () => ops;
  (handler as any)._getExecutedOps = () => executedOps;
  (handler as any)._getMeta = () => meta as TxMeta;
  (handler as any)._getStatus = () => status;

  return handler;
}

/**
 * 执行事务
 */
export async function executeTransaction(
  app: App,
  transactionBuilder: (handler: TransactionHandler) => void | Promise<void>,
  origin: TxOrigin
): Promise<Transaction> {
  return new Promise((resolve, reject) => {
    app.txQueue.queueTask(async () => {
      try {
        const result = await execTransaction(app, transactionBuilder, origin);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * 执行事务的核心逻辑
 */
async function execTransaction(
  app: App,
  transactionBuilder: (handler: TransactionHandler) => void | Promise<void>,
  origin: TxOrigin
): Promise<Transaction> {
  const beforeFrontiers = app.doc.frontiers();

  try {
    const handler = createTransactionHandler(app) as TransactionHandler & {
      _getOps: () => TxOpParams[];
      _getExecutedOps: () => TxExecutedOperation[];
      _getMeta: () => TxMeta;
      _getStatus: () => TxStatus;
    };

    // 设置默认的选区信息
    const lastFocusedEditor = getLastFocusedEditor(app);
    const beforeSelection = getEditorSelectionInfo(lastFocusedEditor);
    if (beforeSelection) {
      handler.setBeforeSelection(beforeSelection);
    }

    // 设置 origin
    handler.setOrigin(origin);

    // 执行事务构建器
    await transactionBuilder(handler);

    // 检查事务状态
    if (handler._getStatus() === "rollbacked") {
      throw new Error("Transaction was rolled back");
    }

    // 如果没有手动提交，则自动提交
    if (handler._getStatus() === "notCommit") {
      handler.commit();
    }

    // 设置执行后的选区信息
    const afterSelection = getEditorSelectionInfo(lastFocusedEditor);
    if (afterSelection) {
      handler.setSelection(afterSelection);
    }

    // 提交到 loro doc
    app.doc.commit({ origin: txOriginToString(origin) });

    // 构建事务结果
    const transaction: Transaction = {
      ops: handler._getOps(),
      executedOps: handler._getExecutedOps(),
      meta: handler._getMeta(),
      status: handler._getStatus(),
    };

    // 发送事务完成事件
    app.emit("tx-committed", {
      origin,
      changes: transaction.executedOps.map((op) => {
        const baseChange = {
          type: op.type,
          blockId: op.blockId,
        };

        switch (op.type) {
          case "block:create":
            return {
              ...baseChange,
              parent: op.parent,
              index: op.index,
              data: op.data,
            };
          case "block:delete":
            return {
              ...baseChange,
              oldData: op.oldData,
              oldParent: op.oldParent,
              oldIndex: op.oldIndex,
            };
          case "block:move":
            return {
              ...baseChange,
              parent: op.parent,
              index: op.index,
              oldParent: op.oldParent,
              oldIndex: op.oldIndex,
            };
          case "block:update":
            return { ...baseChange, newData: op.newData, oldData: op.oldData };
          default:
            return baseChange;
        }
      }) as any,
    });

    return transaction;
  } catch (e) {
    console.error("Error in transaction. err=", e);
    app.doc.revertTo(beforeFrontiers);
    throw e;
  }
}

/**
 * 兼容性函数：保持与现有代码的兼容性
 * @deprecated 使用 executeTransaction 替代
 */
export async function tx(
  app: App,
  cb: (txObj: any) => void | Promise<void>,
  origin: TxOrigin
) {
  const transactionBuilder = (handler: TransactionHandler) => {
    const txObj = {
      insertBlockAfter: (blockId: BlockId, dataCb: (dataMap: any) => void) => {
        const dataMap = new Map();
        dataCb(dataMap);
        const data = {
          type: dataMap.get("type"),
          folded: dataMap.get("folded"),
          content: dataMap.get("content"),
        };

        const blockNode = app.tree.getNodeByID(blockId);
        if (!blockNode) {
          throw new Error(`Block ${blockId} not found`);
        }

        const parent = blockNode.parent()?.id ?? null;
        const index = (blockNode.index() ?? 0) + 1;

        return { id: handler.createBlock(parent, index, data) };
      },

      insertBlockBefore: (blockId: BlockId, dataCb: (dataMap: any) => void) => {
        const dataMap = new Map();
        dataCb(dataMap);
        const data = {
          type: dataMap.get("type"),
          folded: dataMap.get("folded"),
          content: dataMap.get("content"),
        };

        const blockNode = app.tree.getNodeByID(blockId);
        if (!blockNode) {
          throw new Error(`Block ${blockId} not found`);
        }

        const parent = blockNode.parent()?.id ?? null;
        const index = blockNode.index() ?? 0;

        return { id: handler.createBlock(parent, index, data) };
      },

      insertBlockUnder: (
        blockId: BlockId | null,
        dataCb: (dataMap: any) => void,
        index?: number
      ) => {
        const dataMap = new Map();
        dataCb(dataMap);
        const data = {
          type: dataMap.get("type"),
          folded: dataMap.get("folded"),
          content: dataMap.get("content"),
        };

        return { id: handler.createBlock(blockId, index ?? 0, data) };
      },

      deleteBlock: (blockId: BlockId) => {
        handler.deleteBlock(blockId);
      },

      moveBlock: (blockId: BlockId, parent: BlockId | null, index: number) => {
        handler.moveBlock(blockId, parent, index);
      },

      updateBlockData: (blockId: BlockId, newData: BlockDataInner) => {
        handler.updateBlock(blockId, newData);
      },

      // 其他兼容方法...
      demoteBlock: demoteBlock(app),
      promoteBlock: promoteBlock(app),
      toggleFold: toggleFold(app),

      updateOrigin: (patch: any) => {
        if (patch.selection) {
          handler.setSelection(patch.selection);
        }
        if (patch.beforeSelection) {
          handler.setBeforeSelection(patch.beforeSelection);
        }
      },
    };

    return cb(txObj);
  };

  return executeTransaction(app, transactionBuilder, origin);
}
