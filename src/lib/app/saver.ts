import type { BlocksVersion } from "../common/types";
import type { App } from "./app";
import { DebouncedTimer } from "@/lib/common/timer/debounced";

/**
 * 负责将 App 中的修改持久化到 storage
 * 所有保存相关的时序、防抖、错误重试逻辑都集中在这里。
 */
export class Saver {
  private app: App;
  private lastSave: BlocksVersion;
  private hasUnsavedChanges = false;
  private timer: DebouncedTimer;
  private isStarted = false;
  private readonly saveDelay = 500; // 500ms
  private readonly saveMaxDelay = 5000; // 最长 5s

  constructor(app: App) {
    this.app = app;
    this.lastSave = app.getCurrentVersion();
    this.timer = new DebouncedTimer(this.saveDelay, this.saveMaxDelay);
    this.isStarted = true;

    // 当文档事务提交时触发防抖保存
    this.app.on("tx-committed", () => {
      if (!this.isStarted) return;
      this.hasUnsavedChanges = true;
      this.scheduleSave();
    });
  }

  /** 手动触发一次保存 */
  forceSave(): void {
    if (!this.isStarted) {
      throw new Error("Saver 已停止，无法保存");
    }
    this.timer.flush();
  }

  /** 停止 saver，保证最后一次保存成功 */
  stop(): void {
    if (!this.isStarted) return;
    this.isStarted = false;
    this.timer.cancel();
    this.save();
  }

  private scheduleSave(): void {
    this.timer.trigger(() => this.save());
  }

  private save(): void {
    const { app } = this;
    if (!this.isStarted) return;
    if (!this.hasUnsavedChanges) return;

    try {
      const update = this.app.exportUpdateFrom(this.lastSave);

      // 只有在有增量内容时才写入
      if (update.length > 0) {
        app._persistence.writeUpdate(this.app.docId, update);
        app.updateCounter.inc();
        this.lastSave = this.app.getCurrentVersion();
        console.debug(`已保存更新，当前更新数量: ${app.updateCounter.get()}`);
      }

      this.hasUnsavedChanges = false;
    } catch (error) {
      console.error("保存数据失败:", error);
      // 保存失败时稍后重试
      this.hasUnsavedChanges = true;
      setTimeout(() => {
        if (this.hasUnsavedChanges) this.scheduleSave();
      }, 1000);
    }
  }
}
