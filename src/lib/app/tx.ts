import {
  insertBlockAfter,
  insertBlockBefore,
  insertBlockUnder,
  deleteBlock,
  demoteBlock,
  promoteBlock,
  toggleFold,
  updateBlockData,
  moveBlock,
} from "./commands";
import type { App } from "./app";
import type { TxOrigin } from "../common/types";
import { txOriginToString } from "../common/origin-utils";

export class TransactionManager {
  private app: App;

  constructor(app: App) {
    this.app = app;
  }

  private createTxObj(txOrigin: TxOrigin) {
    const { app } = this;
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
      updateOrigin: (patch: Partial<TxOrigin>) =>
        Object.assign(txOrigin, patch),
    };
    return txObj;
  }

  /**
   * 所有对块的修改走这个方法
   *
   * （视图：ProseMirror View）
   * - 结构性修改：先派发对应的结构性更改事务，然后触发视图重绘和更改持久化
   * - 内容行修改：直接更新视图，然后派发对应的 update 事务，持久化更改
   */
  async tx(
    cb: (txObj: ReturnType<typeof this.createTxObj>) => void | Promise<void>,
    origin: TxOrigin
  ) {
    const { app } = this;
    const beforeFrontiers = app._doc.frontiers();
    try {
      const txObj = this.createTxObj(origin);
      await cb(txObj);
    } catch (e) {
      console.error("Error in transaction. err=", e);
      app._doc.revertTo(beforeFrontiers);
      await new Promise((resolve) => setTimeout(resolve));
      return;
    }
    app._doc.commit({ origin: txOriginToString(origin) });
    await new Promise((resolve) =>
      setTimeout(() => {
        // 可能我们的一个事务没有任何内容上的变更，只
        // 通过 origin 修改了 selection 之类的东西
        // 此时 this.doc.commit 就不会触发任何事件
        // 因此我们在这里手工检查事件是否触发，如果
        // 没有触发，则手工触发
        const lastEvent = app._loroEventTransformer.lastEvent;
        if (lastEvent == null || lastEvent.origin.txId !== origin.txId) {
          // 手工触发
          app._emit("tx-committed", {
            changes: [], // 没有变更
            origin,
          });
        }
        resolve(undefined);
      })
    );
  }
}
