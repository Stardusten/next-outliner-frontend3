import type { BlockDataInner, BlockId } from "@/lib/common/types";
import { ref, type Ref } from "vue";
import type { AppStep3 } from "../app";
import { getBlockRefs } from "../util";

export function initInRefsAndInTags(app: AppStep3) {
  const inRefs = new Map();
  const inTags = new Map();
  const schema = app.detachedSchema;

  const ret = Object.assign(app, {
    inRefs,
    inTags,
    getInRefs: (id: BlockId) => getInRefs(ret, id),
    getInTags: (id: BlockId) => getInTags(ret, id),
    refreshInRefs: () => refreshInRefs(ret),
    refreshInTags: () => refreshInTags(ret),
  });

  app.on("tx-committed", (e) => {
    for (const change of e.executedOps) {
      if (change.type === "block:create") {
        const blockData = app.getBlockData(change.blockId);
        if (!blockData) continue;
        if (blockData.type === "text" || blockData.type === "code") {
          const nodeJson = JSON.parse(blockData.content);
          const pmNode = schema.nodeFromJSON(nodeJson);
          const refs = getBlockRefs(pmNode, false);
          const tags = getBlockRefs(pmNode, true);
          for (const ref of refs) addInRef(ret, ref, change.blockId);
          for (const tag of tags) addInTag(ret, tag, change.blockId);
        }
      } else if (change.type === "block:delete") {
        const blockData = app.getBlockData(change.blockId, true);
        if (!blockData) continue;
        if (blockData.type === "text" || blockData.type === "code") {
          const nodeJson = JSON.parse(blockData.content);
          const pmNode = schema.nodeFromJSON(nodeJson);
          const refs = getBlockRefs(pmNode, false);
          const tags = getBlockRefs(pmNode, true);
          for (const ref of refs) removeInRef(ret, ref, change.blockId);
          for (const tag of tags) removeInTag(ret, tag, change.blockId);
        }
      } else if (change.type === "block:update") {
        const { blockId, newData, oldData } = change;
        if (oldData.type === "text" || oldData.type === "code") {
          const oldJson = JSON.parse(oldData.content);
          const oldPmNode = schema.nodeFromJSON(oldJson);
          const oldRefs = getBlockRefs(oldPmNode, false);
          const oldTags = getBlockRefs(oldPmNode, true);
          for (const ref of oldRefs) removeInRef(ret, ref, blockId);
          for (const tag of oldTags) removeInTag(ret, tag, blockId);
        }
        if (newData && (newData.type === "text" || newData.type === "code")) {
          const newJson = JSON.parse(newData.content);
          const newPmNode = schema.nodeFromJSON(newJson);
          const refs = getBlockRefs(newPmNode, false);
          const tags = getBlockRefs(newPmNode, true);
          for (const ref of refs) addInRef(ret, ref, blockId);
          for (const tag of tags) addInTag(ret, tag, blockId);
        }
      }
    }
  });

  refreshInRefs(ret);
  refreshInTags(ret);

  return ret;
}

type AppWithInRefsAndInTags = AppStep3 & {
  inRefs: Map<BlockId, Ref<Set<BlockId>>>;
  inTags: Map<BlockId, Ref<Set<BlockId>>>;
};

/**
 * @deprecated
 */
export function getInRefs(
  app: AppWithInRefsAndInTags,
  id: BlockId
): Ref<Set<BlockId>> {
  let res = app.inRefs.get(id);
  if (res) return res;
  else {
    res = ref(new Set());
    app.inRefs.set(id, res);
    return res;
  }
}

/**
 * @deprecated
 */
export function getInTags(
  app: AppWithInRefsAndInTags,
  id: BlockId
): Ref<Set<BlockId>> {
  let res = app.inTags.get(id);
  if (res) return res;
  else {
    res = ref(new Set());
    app.inTags.set(id, res);
    return res;
  }
}

/**
 * 刷新所有块的反链
 * @deprecated
 */
export function refreshInRefs(app: AppWithInRefsAndInTags) {
  app.inRefs.clear();
  for (const node of app.getAllNodes(false)) {
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
 * @deprecated
 */
export function refreshInTags(app: AppWithInRefsAndInTags) {
  app.inTags.clear();
  for (const node of app.getAllNodes(false)) {
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
function addInRef(app: AppWithInRefsAndInTags, a: BlockId, b: BlockId) {
  let set = app.inRefs.get(a);
  if (!set) {
    set = ref(new Set([b]));
    app.inRefs.set(a, set);
  } else {
    set.value.add(b);
  }
}

/**
 * 更新 this.inTags，记录 b 引用了 a
 */
function addInTag(app: AppWithInRefsAndInTags, a: BlockId, b: BlockId) {
  let set = app.inTags.get(a);
  if (!set) {
    set = ref(new Set([b]));
    app.inTags.set(a, set);
  } else {
    set.value.add(b);
  }
}

/**
 * 更新 this.inRefs，删除 b 引用了 a
 */
function removeInRef(app: AppWithInRefsAndInTags, a: BlockId, b: BlockId) {
  const set = app.inRefs.get(a);
  if (set) {
    set.value.delete(b);
  }
}

/**
 * 更新 this.inTags，删除 b 引用了 a
 */
function removeInTag(app: AppWithInRefsAndInTags, a: BlockId, b: BlockId) {
  const set = app.inTags.get(a);
  if (set) {
    set.value.delete(b);
  }
}
