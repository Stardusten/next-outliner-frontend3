import { Observable } from "../../common/observable";
import { outlinerSchema } from "../../editor/schema";
import type { BlockId } from "@/lib/common/types";
import type { App } from "../app";
import { getInRefs } from "./in-refs";
import { getBlockData } from "../block-manage";

export function initTextContent(app: App) {
  app.textContentCache = new Map();
  app.textContentObs = new Map();

  /**
   * 注册一个监听器，当一个块内容更新时
   * 1. 触发文本内容缓存失效
   * 2. 更新对应 Observable，如果有
   */
  app.on("tx-committed", (e) => {
    for (const change of e.executedOps) {
      if (change.type === "block:update") {
        // 触发文本内容缓存失效
        invalidateTextContent(app, change.blockId);
        // 更新对应 Observable
        const obs = getTextContentReactive(app, change.blockId);
        obs.set(getTextContent(app, change.blockId));
      }
    }
  });
}

/**
 * 获取块的文本内容，会解析块引用并处理循环引用。
 * 如果无法获得文本内容，则返回块ID
 */
export function getTextContent(
  app: App,
  id: BlockId,
  visited?: Set<BlockId>
): string {
  // 用于记录已访问的块，避免循环引用
  visited ??= new Set<BlockId>();
  loadTextContentToCache(app, id, visited);
  return app.textContentCache.get(id) ?? id;
}

export function getTextContentReactive(
  app: App,
  blockId: BlockId
): Observable<string> {
  const obs = app.textContentObs.get(blockId);
  if (obs) return obs;
  else {
    const obsNew = new Observable(getTextContent(app, blockId));
    obsNew.setDisposer(() => {
      app.textContentObs.delete(blockId);
    });
    app.textContentObs.set(blockId, obsNew);
    return obsNew;
  }
}

/**
 * 缓存失效方法，用于触发文本内容缓存失效
 */
export function invalidateTextContent(app: App, blockId?: BlockId): void {
  invalidateTextContentCache(app, blockId);
}

/**
 * 让一个块的文本内容缓存失效，注意这同时会递归地
 * 所有引用了这个块的块的文本内容缓存失效
 */
function invalidateTextContentCache(app: App, blockId?: BlockId): void {
  if (blockId) {
    const inRefs = getInRefs(app, blockId);
    for (const ref of inRefs.get()) {
      invalidateTextContentCache(app, ref); // 递归
    }
    app.textContentCache.delete(blockId);
  } else {
    app.textContentCache.clear();
  }
}

function loadTextContentToCache(
  app: App,
  blockId: BlockId,
  visited: Set<BlockId>
): void {
  if (visited.has(blockId)) return;
  visited.add(blockId);

  if (app.textContentCache.has(blockId)) return;

  const blockData = getBlockData(app, blockId);
  if (!blockData) return;

  let textContent = "";
  if (blockData.type === "text" || blockData.type === "code") {
    const nodeJson = JSON.parse(blockData.content);
    const node = outlinerSchema.nodeFromJSON(nodeJson);

    const arr: string[] = [];
    node.content.descendants((currNode) => {
      if (currNode.isText) arr.push(currNode.text ?? "");
      else if (currNode.type === outlinerSchema.nodes.blockRef) {
        const blockId = currNode.attrs.blockId;
        const content = getTextContent(app, blockId, visited);
        arr.push(content);
      } else if (currNode.type === outlinerSchema.nodes.codeblock) {
        arr.push(currNode.textContent);
      }
    });
    textContent = arr.join("");
  }

  app.textContentCache.set(blockId, textContent);
}
