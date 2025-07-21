import type { App } from "./app";

export function initUndoRedoManager(app: App) {
  app.undoStack = [];
  app.redoStack = [];
  app.idMapping = {};

  app.on("tx-committed", (tx) => {
    if (tx.meta.origin === "undoRedo") return;
    app.redoStack.length = 0;
    app.undoStack.push({
      executedOps: tx.executedOps,
      beforeSelection: tx.meta.beforeSelection,
      afterSelection: tx.meta.selection,
    });
  });
}

// 说明：canUndo、canRedo、undo、redo 方法在 editor 里面
