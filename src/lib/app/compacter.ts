import type { App } from "./app";
import { DebouncedTimer } from "@/lib/common/timer/debounced";
import type { Saver } from "./saver";

/**
 * Compacter 负责将文档中的更新压缩到持久化层，
 * 从而避免 localStorage 中存储过多的增量更新。
 */
export class Compacter {
  private app: App;
  private saver: Saver;
  private timer: DebouncedTimer;
  private isStarted = false;

  private readonly compactDelay = 10000; // 10 秒空闲后压缩
  private readonly compactMaxDelay = 60000; // 最长 1min 必须压缩一次
  private readonly maxUpdatesBeforeCompact = 50; // 超过 50 次更新立即压缩

  constructor(app: App, saver: Saver) {
    this.app = app;
    this.saver = saver;
    this.timer = new DebouncedTimer(this.compactDelay, this.compactMaxDelay);
    this.isStarted = true;

    // 监听事务提交事件，决定是否调度压缩
    app.on("tx-committed", () => {
      if (!this.isStarted) return;
      this.scheduleIfNeeded();
    });

    // 启动时若已存在较多更新，则立即安排压缩
    if (app.updateCounter.get() > 0) {
      console.debug(`发现 ${app.updateCounter.get()} 个现有更新，安排压缩任务`);
      this.scheduleIfNeeded();
    }
  }

  /** 调度一次压缩（满足阈值立即执行，否则防抖） */
  public scheduleIfNeeded(): void {
    const { app } = this;
    if (!this.isStarted) return;

    // 达到阈值立即执行
    if (app.updateCounter.get() >= this.maxUpdatesBeforeCompact) {
      console.debug(
        `更新数量达到阈值 ${this.maxUpdatesBeforeCompact}，立即执行压缩`
      );
      this.timer.flush();
    } else {
      // 否则延迟压缩
      this.timer.trigger(() => this.performCompact());
    }
  }

  /** 立即执行一次压缩 */
  public forceCompact(): void {
    if (!this.isStarted) {
      throw new Error("Compacter 已停止，无法压缩");
    }
    this.timer.flush();
  }

  /** 停止 Compacter，并尽可能完成最后一次压缩 */
  public stop(): void {
    if (!this.isStarted) return;
    this.isStarted = false;
    this.timer.cancel();
    // 最后努力执行一次压缩
    this.performCompact();
  }

  /** 真正的压缩逻辑 */
  private performCompact(): void {
    const { app } = this;
    if (app.updateCounter.get() === 0) {
      console.debug("没有更新需要压缩");
      return;
    }

    try {
      const before = app.updateCounter.get();
      app._persistence.compact(app.docId);
      app.updateCounter.set(0);
      console.debug(`已执行压缩，清理了 ${before} 个更新`);
    } catch (err) {
      console.error("压缩失败:", err);
    }
  }
}
