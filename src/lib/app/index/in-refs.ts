import type { BlockDataInner, BlockId } from "@/lib/common/types";
import { Observable } from "../../common/observable";
import { outlinerSchema } from "../../editor/schema";
import type { App } from "../app";
import { getBlockRefs } from "../util";

export class InRefsManager {
  /**
   * 记录每个块的反链，即引用了这个块的块
   */
  private inRefs: Map<BlockId, Observable<Set<BlockId>>>;
  private app: App;

  constructor(app: App) {
    this.app = app;
    this.inRefs = new Map();
  }

  /**
   * 获取块的反链
   */
  getInRefs(id: BlockId): Observable<Set<BlockId>> {
    let res = this.inRefs.get(id);
    if (res) return res;
    else {
      res = new Observable(new Set());
      this.inRefs.set(id, res);
      return res;
    }
  }

  /**
   * 刷新所有块的反链
   */
  refreshInRefs() {
    const { app } = this;
    for (const node of app.getAllNodes(false)) {
      const data = node.data.toJSON() as BlockDataInner;
      const nodeJson = JSON.parse(data.content);
      const pmNode = outlinerSchema.nodeFromJSON(nodeJson);
      const refs = getBlockRefs(pmNode);
      for (const ref of refs) this.addInRef(ref, node.id);
    }
  }

  /**
   * 更新 this.inRefs，记录 b 引用了 a
   */
  private addInRef(a: BlockId, b: BlockId) {
    let set = this.inRefs.get(a);
    if (!set) {
      set = new Observable(new Set([b]));
      this.inRefs.set(a, set);
    } else {
      set.update((val) => val.add(b));
    }
  }

  /**
   * 更新 this.inRefs，删除 b 引用了 a
   */
  private removeInRef(a: BlockId, b: BlockId) {
    const set = this.inRefs.get(a);
    if (set) {
      set.update((val) => val.delete(b));
    }
  }

  /**
   * 注册一个监听器，监听块事件，然后更新 this.inRefs
   */
  private registerInRefUpdater() {
    const { app } = this;
    app.on("tx-committed", (e) => {
      for (const change of e.changes) {
        if (change.type === "block:create") {
          const blockData = app.getBlockData(change.blockId);
          if (!blockData) continue;
          const nodeJson = JSON.parse(blockData.content);
          const pmNode = outlinerSchema.nodeFromJSON(nodeJson);
          const refs = getBlockRefs(pmNode);
          for (const ref of refs) this.addInRef(ref, change.blockId);
        } else if (change.type === "block:delete") {
          const blockData = app.getBlockData(change.blockId, true);
          if (!blockData) continue;
          const nodeJson = JSON.parse(blockData.content);
          const pmNode = outlinerSchema.nodeFromJSON(nodeJson);
          const refs = getBlockRefs(pmNode);
          for (const ref of refs) this.removeInRef(ref, change.blockId);
        } else if (change.type === "block:update") {
          console.log(change);
          const { blockId, newData, oldData } = change;
          const oldJson = JSON.parse(oldData.content);
          const newJson = JSON.parse(newData.content);
          const oldPmNode = outlinerSchema.nodeFromJSON(oldJson);
          const newPmNode = outlinerSchema.nodeFromJSON(newJson);
          const oldRefs = getBlockRefs(oldPmNode);
          const newRefs = getBlockRefs(newPmNode);
          for (const ref of oldRefs) this.removeInRef(ref, blockId);
          for (const ref of newRefs) this.addInRef(ref, blockId);
        }
      }
    });
  }
}
