import type { App } from "./app";
import { DebouncedTimer } from "@/lib/common/timer/debounced";

const compactDelay = 10000; // 10 秒空闲后压缩
const compactMaxDelay = 60000; // 最长 1min 必须压缩一次
const maxUpdatesBeforeCompact = 50; // 超过 50 次更新立即压缩

/**
 * 初始化压缩器，负责将文档中的更新压缩到持久化层，
 * 从而避免 localStorage 中存储过多的增量更新。
 */
export function initCompacter(app: App) {
  app.compactTimer = new DebouncedTimer(compactDelay, compactMaxDelay);
  app.compactDelay = compactDelay;
  app.compactMaxDelay = compactMaxDelay;
  app.maxUpdatesBeforeCompact = maxUpdatesBeforeCompact;

  // 监听事务提交事件，决定是否调度压缩
  app.on("tx-committed", () => {
    scheduleCompactIfNeeded(app);
  });

  // 启动时若已存在较多更新，则立即安排压缩
  if (app.updatesCount > 0) {
    console.debug(`发现 ${app.updatesCount} 个现有更新，安排压缩任务`);
    scheduleCompactIfNeeded(app);
  }
}

/**
 * 调度一次压缩（满足阈值立即执行，否则防抖）
 */
export function scheduleCompactIfNeeded(app: App): void {
  // 达到阈值立即执行
  if (app.updatesCount >= app.maxUpdatesBeforeCompact) {
    console.debug(
      `更新数量达到阈值 ${app.maxUpdatesBeforeCompact}，立即执行压缩`
    );
    app.compactTimer.flush();
  } else {
    // 否则延迟压缩
    app.compactTimer.trigger(() => performCompact(app));
  }
}

/**
 * 立即执行一次压缩
 */
export function forceCompact(app: App): void {
  app.compactTimer.flush();
}

/**
 * 停止压缩器，并尽可能完成最后一次压缩
 */
export function stopCompacter(app: App): void {
  app.compactTimer.cancel();
  // 最后努力执行一次压缩
  performCompact(app);
}

/**
 * 真正的压缩逻辑
 */
function performCompact(app: App): void {
  if (app.updatesCount === 0) {
    console.debug("没有更新需要压缩");
    return;
  }

  try {
    const before = app.updatesCount;
    app.persistence.compact(app.docId);
    app.updatesCount = 0;
    console.debug(`已执行压缩，清理了 ${before} 个更新`);
  } catch (err) {
    console.error("压缩失败:", err);
  }
}
