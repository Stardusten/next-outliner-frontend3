import { txOriginToString } from "../common/origin-utils";
import { AsyncTaskQueue } from "../common/taskQueue";
import type { TxOrigin } from "../common/types";
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

/**
 * 初始化事务管理器
 */
export function initTransactionManager(app: App) {
  app.txQueue = new AsyncTaskQueue();
}

/**
 * 创建事务对象
 */
function createTxObj(app: App, txOrigin: TxOrigin) {
  const txObj = {
    insertBlockAfter: insertBlockAfter(app),
    insertBlockBefore: insertBlockBefore(app),
    insertBlockUnder: insertBlockUnder(app),
    deleteBlock: deleteBlock(app),
    demoteBlock: demoteBlock(app),
    promoteBlock: promoteBlock(app),
    toggleFold: toggleFold(app),
    updateBlockData: updateBlockData(app),
    moveBlock: moveBlock(app),
    updateOrigin: (
      patch: Partial<Omit<TxOrigin, "txId" | "type" | "editorId">>
    ) => Object.assign(txOrigin, patch),
  };
  return txObj;
}

/**
 * 执行事务
 */
export async function tx(
  app: App,
  cb: (txObj: ReturnType<typeof createTxObj>) => void | Promise<void>,
  origin: TxOrigin
) {
  // 本地同一个块的内容更改应用防抖策略
  // 也就是如果用户在一个块内连续打字，最后只触发一次 tx
  // 但如果先在块 A 内打字，然后在块 B 内打字，则块 B 内的 tx 不会
  // 与块 A 内的事务一起应用防抖
  if (origin.type === "localEditorContent") {
    return app.txQueue.queueTaskAndWait(() => execTx(app, cb, origin), {
      key: `${origin.editorId}-${origin.blockId}`,
      delay: 500,
    });
  } else {
    return app.txQueue.queueTaskAndWait(() => execTx(app, cb, origin));
  }
}

/**
 * 执行事务的核心逻辑
 */
async function execTx(
  app: App,
  cb: (txObj: ReturnType<typeof createTxObj>) => void | Promise<void>,
  origin: TxOrigin
) {
  // console.log("execTx", origin);
  const beforeFrontiers = app.doc.frontiers();
  try {
    const txObj = createTxObj(app, origin);

    // 事务提交前，如果没有指定 beforeSelection，补上
    const lastFocusedEditor = getLastFocusedEditor(app);
    const beforeSelection =
      origin.beforeSelection ?? getEditorSelectionInfo(lastFocusedEditor!);

    await cb(txObj);

    // 事务提交后，如果没有指定 selection，补上
    const selection =
      origin.selection ?? getEditorSelectionInfo(lastFocusedEditor);

    origin.beforeSelection = beforeSelection ?? undefined;
    origin.selection = selection ?? undefined;
  } catch (e) {
    console.error("Error in transaction. err=", e);
    app.doc.revertTo(beforeFrontiers);
    await new Promise((resolve) => setTimeout(resolve));
    return;
  }
  app.doc.commit({ origin: txOriginToString(origin) });
  // 可能我们一个事务没有任何内容上的变更，只
  // 通过 origin 修改了 selection 之类的东西
  // 此时 this.doc.commit 就不会触发任何事件
  // 因此我们在这里手工检查是否处于这种情况
  // 如果处于这种情况，则手动派发 tx-committed 事件
  if (origin.type !== "undoRedo") {
    const cmp = app.doc.cmpWithFrontiers(beforeFrontiers);
    if (cmp < 1) {
      app.emit("tx-committed", {
        changes: [],
        origin,
      });
    }
  }
}
