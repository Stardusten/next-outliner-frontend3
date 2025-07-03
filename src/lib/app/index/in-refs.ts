import type { BlockDataInner, BlockId } from "@/lib/common/types";
import { Observable } from "../../common/observable";
import { outlinerSchema } from "../../editor/schema";
import type { App } from "../app";
import { getBlockRefs } from "../util";
import { getAllNodes, getBlockData } from "../block-manage";

export function initInRefs(app: App) {
  app.inRefs = new Map();

  app.on("tx-committed", (e) => {
    for (const change of e.changes) {
      if (change.type === "block:create") {
        const blockData = getBlockData(app, change.blockId);
        if (!blockData) continue;
        if (blockData.type === "text" || blockData.type === "code") {
          const nodeJson = JSON.parse(blockData.content);
          const pmNode = outlinerSchema.nodeFromJSON(nodeJson);
          const refs = getBlockRefs(pmNode);
          for (const ref of refs) addInRef(app, ref, change.blockId);
        }
      } else if (change.type === "block:delete") {
        const blockData = getBlockData(app, change.blockId, true);
        if (!blockData) continue;
        if (blockData.type === "text" || blockData.type === "code") {
          const nodeJson = JSON.parse(blockData.content);
          const pmNode = outlinerSchema.nodeFromJSON(nodeJson);
          const refs = getBlockRefs(pmNode);
          for (const ref of refs) removeInRef(app, ref, change.blockId);
        }
      } else if (change.type === "block:update") {
        const { blockId, newData, oldData } = change;
        if (oldData.type === "text" || oldData.type === "code") {
          const oldJson = JSON.parse(oldData.content);
          const oldPmNode = outlinerSchema.nodeFromJSON(oldJson);
          const oldRefs = getBlockRefs(oldPmNode);
          for (const ref of oldRefs) removeInRef(app, ref, blockId);
        }
        if (newData && (newData.type === "text" || newData.type === "code")) {
          const newJson = JSON.parse(newData.content);
          const newPmNode = outlinerSchema.nodeFromJSON(newJson);
          const refs = getBlockRefs(newPmNode);
          for (const ref of refs) addInRef(app, ref, blockId);
        }
      }
    }
  });
}

/**
 * 获取块的反链
 */
export function getInRefs(app: App, id: BlockId): Observable<Set<BlockId>> {
  let res = app.inRefs.get(id);
  if (res) return res;
  else {
    res = new Observable(new Set());
    app.inRefs.set(id, res);
    return res;
  }
}

/**
 * 刷新所有块的反链
 */
export function refreshInRefs(app: App) {
  for (const node of getAllNodes(app, false)) {
    const data = node.data.toJSON() as BlockDataInner;
    if (data.type === "text" || data.type === "code") {
      const nodeJson = JSON.parse(data.content);
      const pmNode = outlinerSchema.nodeFromJSON(nodeJson);
      const refs = getBlockRefs(pmNode);
      for (const ref of refs) addInRef(app, ref, node.id);
    }
  }
}

/**
 * 更新 this.inRefs，记录 b 引用了 a
 */
function addInRef(app: App, a: BlockId, b: BlockId) {
  let set = app.inRefs.get(a);
  if (!set) {
    set = new Observable(new Set([b]));
    app.inRefs.set(a, set);
  } else {
    set.update((val) => val.add(b));
  }
}

/**
 * 更新 this.inRefs，删除 b 引用了 a
 */
function removeInRef(app: App, a: BlockId, b: BlockId) {
  const set = app.inRefs.get(a);
  if (set) {
    set.update((val) => val.delete(b));
  }
}
