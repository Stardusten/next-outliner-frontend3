import type { BlocksVersion } from "../common/types";
import type { App } from "./app";
import { DebouncedTimer } from "@/lib/common/timer/debounced";

const saveDelay = 500; // 500ms
const saveMaxDelay = 5000; // 最长 5s

/**
 * 初始化保存器，负责将 App 中的修改持久化到 storage
 * 所有保存相关的时序、防抖、错误重试逻辑都集中在这里。
 */
export function initSaver(app: App) {
  app.lastSave = app.doc.version();
  app.hasUnsavedChanges = false;
  app.saveTimer = new DebouncedTimer(saveDelay, saveMaxDelay);
  app.saveDelay = saveDelay;
  app.saveMaxDelay = saveMaxDelay;

  // 当文档事务提交时触发防抖保存
  app.on("tx-committed", () => {
    app.hasUnsavedChanges = true;
    scheduleSave(app);
  });
}

/**
 * 手动触发一次保存
 */
export function forceSave(app: App): void {
  app.saveTimer.flush();
}

/**
 * 停止保存器，保证最后一次保存成功
 */
export function stopSaver(app: App): void {
  app.saveTimer.cancel();
  save(app);
}

/**
 * 调度保存
 */
function scheduleSave(app: App): void {
  app.saveTimer.trigger(() => save(app));
}

/**
 * 真正的保存逻辑
 */
function save(app: App): void {
  if (!app.hasUnsavedChanges) return;

  try {
    const update = app.doc.export({ mode: "update", from: app.lastSave });

    // 只有在有增量内容时才写入
    if (update.length > 0) {
      app.persistence.writeUpdate(app.docId, update);
      app.updatesCount++;
      app.lastSave = app.doc.version();
      console.debug(`已保存更新，当前更新数量: ${app.updatesCount}`);
    }

    app.hasUnsavedChanges = false;
  } catch (error) {
    console.error("保存数据失败:", error);
    // 保存失败时稍后重试
    app.hasUnsavedChanges = true;
    setTimeout(() => {
      if (app.hasUnsavedChanges) scheduleSave(app);
    }, 1000);
  }
}
