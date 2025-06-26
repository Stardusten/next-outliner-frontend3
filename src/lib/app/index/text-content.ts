import { Observable } from "../../common/observable";
import { outlinerSchema } from "../../editor/schema";
import type { BlockId } from "@/lib/common/types";
import type { App } from "../app";

export class TextContentManager {
  private app: App;
  private textContentCache: Map<BlockId, string> = new Map();
  private textContentObs: Map<BlockId, Observable<string>> = new Map();

  constructor(app: App) {
    this.app = app;

    /**
     * 注册一个监听器，当一个块内容更新时
     * 1. 触发文本内容缓存失效
     * 2. 更新对应 Observable，如果有
     */
    app.on("tx-committed", (e) => {
      for (const change of e.changes) {
        if (change.type === "block:update") {
          // 触发文本内容缓存失效
          this.invalidate(change.blockId);
          // 更新对应 Observable
          const obs = this.getTextContentReactive(change.blockId);
          obs.set(this.getTextContent(change.blockId));
        }
      }
    });
  }

  /**
   * 获取块的文本内容，会解析块引用并处理循环引用。
   * 如果无法获得文本内容，则返回块ID
   */
  getTextContent(id: BlockId, visited?: Set<BlockId>): string {
    // 用于记录已访问的块，避免循环引用
    visited ??= new Set<BlockId>();
    this.loadTextContentToCache(id, visited);
    return this.textContentCache.get(id) ?? id;
  }

  getTextContentReactive(blockId: BlockId): Observable<string> {
    const obs = this.textContentObs.get(blockId);
    if (obs) return obs;
    else {
      const obsNew = new Observable(this.getTextContent(blockId));
      obsNew.setDisposer(() => {
        this.textContentObs.delete(blockId);
      });
      this.textContentObs.set(blockId, obsNew);
      return obsNew;
    }
  }

  /**
   * 让一个块的文本内容缓存失效，注意这同时会递归地
   * 所有引用了这个块的块的文本内容缓存失效
   */
  private invalidateTextContentCache(blockId?: BlockId): void {
    const { app } = this;
    if (blockId) {
      const inRefs = app.getInRefs(blockId);
      for (const ref of inRefs.get()) {
        this.invalidateTextContentCache(ref); // 递归
      }
      this.textContentCache.delete(blockId);
    } else {
      this.textContentCache.clear();
    }
  }

  private loadTextContentToCache(
    blockId: BlockId,
    visited: Set<BlockId>
  ): void {
    const { app } = this;
    if (visited.has(blockId)) return;
    visited.add(blockId);

    if (this.textContentCache.has(blockId)) return;

    const blockData = app.getBlockData(blockId);
    if (!blockData) return;

    const nodeJson = JSON.parse(blockData.content);
    const node = outlinerSchema.nodeFromJSON(nodeJson);

    const arr: string[] = [];
    node.content.descendants((currNode) => {
      if (currNode.isText) arr.push(currNode.text ?? "");
      else if (currNode.type === outlinerSchema.nodes.blockRef) {
        const blockId = currNode.attrs.blockId;
        const content = this.getTextContent(blockId, visited);
        arr.push(content);
      } else if (currNode.type === outlinerSchema.nodes.codeblock) {
        arr.push(currNode.textContent);
      }
    });
    const textContent = arr.join("");
    this.textContentCache.set(blockId, textContent);
  }

  /**
   * 对外暴露的缓存失效方法，内部调用同名 private 方法。
   */
  invalidate(blockId?: BlockId): void {
    this.invalidateTextContentCache(blockId);
  }
}
