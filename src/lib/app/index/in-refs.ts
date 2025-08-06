import type { BlockDataInner, BlockId } from "@/lib/common/types";
import { shallowRef, type Ref } from "vue";
import type { App } from "../app";
import { getAllNodes, getBlockData } from "../block-manage";
import { getBlockRefs } from "../util";

export function initInRefs(app: App) {
  app.inRefs = new Map();
  app.inTags = new Map();
  const schema = app.detachedSchema;

  app.on("tx-committed", (e) => {
    for (const change of e.executedOps) {
      if (change.type === "block:create") {
        const blockData = getBlockData(app, change.blockId);
        if (!blockData) continue;
        if (blockData.type === "text" || blockData.type === "code") {
          const nodeJson = JSON.parse(blockData.content);
          const pmNode = schema.nodeFromJSON(nodeJson);
          const refs = getBlockRefs(pmNode, false);
          const tags = getBlockRefs(pmNode, true);
          for (const ref of refs) addInRef(app, ref, change.blockId);
          for (const tag of tags) addInTag(app, tag, change.blockId);
        }
      } else if (change.type === "block:delete") {
        const blockData = getBlockData(app, change.blockId, true);
        if (!blockData) continue;
        if (blockData.type === "text" || blockData.type === "code") {
          const nodeJson = JSON.parse(blockData.content);
          const pmNode = schema.nodeFromJSON(nodeJson);
          const refs = getBlockRefs(pmNode, false);
          const tags = getBlockRefs(pmNode, true);
          for (const ref of refs) removeInRef(app, ref, change.blockId);
          for (const tag of tags) removeInTag(app, tag, change.blockId);
        }
      } else if (change.type === "block:update") {
        const { blockId, newData, oldData } = change;
        if (oldData.type === "text" || oldData.type === "code") {
          const oldJson = JSON.parse(oldData.content);
          const oldPmNode = schema.nodeFromJSON(oldJson);
          const oldRefs = getBlockRefs(oldPmNode, false);
          const oldTags = getBlockRefs(oldPmNode, true);
          for (const ref of oldRefs) removeInRef(app, ref, blockId);
          for (const tag of oldTags) removeInTag(app, tag, blockId);
        }
        if (newData && (newData.type === "text" || newData.type === "code")) {
          const newJson = JSON.parse(newData.content);
          const newPmNode = schema.nodeFromJSON(newJson);
          const refs = getBlockRefs(newPmNode, false);
          const tags = getBlockRefs(newPmNode, true);
          for (const ref of refs) addInRef(app, ref, blockId);
          for (const tag of tags) addInTag(app, tag, blockId);
        }
      }
    }
  });

  refreshInRefs(app);
  refreshInTags(app);
}

export function getInRefs(app: App, id: BlockId): Ref<Set<BlockId>> {
  let res = app.inRefs.get(id);
  if (res) return res;
  else {
    res = shallowRef(new Set());
    app.inRefs.set(id, res);
    return res;
  }
}

export function getInTags(app: App, id: BlockId): Ref<Set<BlockId>> {
  let res = app.inTags.get(id);
  if (res) return res;
  else {
    res = shallowRef(new Set());
    app.inTags.set(id, res);
    return res;
  }
}

/**
 * 刷新所有块的反链
 */
export function refreshInRefs(app: App) {
  app.inRefs.clear();
  for (const node of getAllNodes(app, false)) {
    const data = node.data.toJSON() as BlockDataInner;
    if (data.type === "text" || data.type === "code") {
      const nodeJson = JSON.parse(data.content);
      const pmNode = app.detachedSchema.nodeFromJSON(nodeJson);
      const refs = getBlockRefs(pmNode, false);
      for (const ref of refs) addInRef(app, ref, node.id);
    }
  }
}

/**
 * 刷新所有块的反链
 */
export function refreshInTags(app: App) {
  app.inTags.clear();
  for (const node of getAllNodes(app, false)) {
    const data = node.data.toJSON() as BlockDataInner;
    if (data.type === "text" || data.type === "code") {
      const nodeJson = JSON.parse(data.content);
      const pmNode = app.detachedSchema.nodeFromJSON(nodeJson);
      const tags = getBlockRefs(pmNode, true);
      for (const tag of tags) addInTag(app, tag, node.id);
    }
  }
}

/**
 * 更新 this.inRefs，记录 b 引用了 a
 */
function addInRef(app: App, a: BlockId, b: BlockId) {
  let set = app.inRefs.get(a);
  if (!set) {
    set = shallowRef(new Set([b]));
    app.inRefs.set(a, set);
  } else {
    set.value.add(b);
  }
}

/**
 * 更新 this.inTags，记录 b 引用了 a
 */
function addInTag(app: App, a: BlockId, b: BlockId) {
  let set = app.inTags.get(a);
  if (!set) {
    set = shallowRef(new Set([b]));
    app.inTags.set(a, set);
  } else {
    set.value.add(b);
  }
}

/**
 * 更新 this.inRefs，删除 b 引用了 a
 */
function removeInRef(app: App, a: BlockId, b: BlockId) {
  const set = app.inRefs.get(a);
  if (set) {
    set.value.delete(b);
  }
}

/**
 * 更新 this.inTags，删除 b 引用了 a
 */
function removeInTag(app: App, a: BlockId, b: BlockId) {
  const set = app.inTags.get(a);
  if (set) {
    set.value.delete(b);
  }
}
