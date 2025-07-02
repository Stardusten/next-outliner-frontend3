import { txOriginFromString } from "../common/origin-utils";
import type { BlockDataInner, BlockId } from "../common/types";
import type { App, BlockChange, AppEvents } from "./app";

/**
 * 负责将 Loro 的事件转换为块事件
 */
export class LoroEventTransformer {
  private app: App;
  lastEvent: AppEvents["tx-committed"] | null = null;

  constructor(app: App) {
    this.app = app;
  }

  start() {
    const { app } = this;
    app._tree.subscribe((eb) => {
      // 如果事件是由 checkout 触发的，则不处理
      if (eb.by === "checkout") return;

      // 不处理来源为 undefined 的事件
      if (eb.origin === undefined) {
        console.warn("block storage event origin is undefined");
        return;
      }

      const origin = txOriginFromString(eb.origin);

      const changes: BlockChange[] = [];
      // 事件定义中，create 事件要求 data 字段
      // 但实际从 tree 的 create 事件中我们拿不到 data
      // 所以这里先收集 create 事件，之后拿到 map 的
      // create 事件时拼起来
      type TempCreateChange = Omit<
        BlockChange & { type: "block:create" },
        "data"
      >;
      const tempCreateChanges: Record<BlockId, TempCreateChange> = {};
      for (const e of eb.events) {
        if (e.diff.type === "tree") {
          // 树结构性变更
          for (const item of e.diff.diff) {
            if (item.action === "create") {
              const blockId = item.target;
              tempCreateChanges[blockId] = {
                type: "block:create",
                blockId,
                parent: item.parent ?? null,
                index: item.index,
              };
            } else if (item.action === "delete") {
              const blockId = item.target;
              const oldData = app.getBlockData(blockId, false, eb.from);
              if (!oldData) return;
              changes.push({
                type: "block:delete",
                blockId,
                oldData,
                oldParent: item.oldParent ?? null,
                oldIndex: item.oldIndex,
              });
            } else if (item.action === "move") {
              changes.push({
                type: "block:move",
                blockId: item.target,
                parent: item.parent ?? null,
                index: item.index,
                oldParent: item.oldParent ?? null,
                oldIndex: item.oldIndex,
              });
            }
          }
        } else if (e.diff.type === "map") {
          const blockId = e.path[1] as BlockId;
          if (tempCreateChanges[blockId]) {
            // 新块的初始化，不生成 update 事件
            // 而是和对应 create 事件拼起来
            const tempCreateChange = tempCreateChanges[blockId];
            changes.push({
              ...tempCreateChange,
              data: e.diff.updated as BlockDataInner,
            });
            delete tempCreateChanges[blockId];
          } else {
            // 块数据变更
            const oldData = app.getBlockData(blockId, false, eb.from);
            if (!oldData) return;
            const newData = { ...oldData, ...e.diff.updated };
            changes.push({
              type: "block:update",
              blockId,
              newData,
              oldData,
            });
          }
        }
      }

      if (changes.length > 0) {
        const event = {
          origin,
          changes,
        };
        this.lastEvent = event; // 记录一下，用于检查是否触发事件
        app._emit("tx-committed", event);
      }
    });
  }
}
