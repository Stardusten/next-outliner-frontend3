// import type { EditorView } from "prosemirror-view";

// type StackItem = BlockTransactionResult[];

// export class UndoRedoManager {
//   private storage: BlockStorage;
//   private undoStack: StackItem[] = [];
//   private redoStack: StackItem[] = [];
//   private maxStackSize: number = 50;
//   private editorId: string;
//   private mergeThreshold: number = 1000; // 合并阈值，单位毫秒
//   private lastItemTimestamp: number = 0; // 上一个 item 的时间戳

//   constructor(
//     storage: BlockStorage,
//     editorId: string,
//     maxStackSize: number = 50,
//     mergeThreshold: number = 1000
//   ) {
//     this.storage = storage;
//     this.editorId = editorId;
//     this.maxStackSize = maxStackSize;
//     this.mergeThreshold = mergeThreshold;
//   }

//   addItem(item: StackItem) {
//     const filtered: StackItem = [];
//     for (const tx of item) {
//       const isUndo = tx.source === TxOrigin.undo(this.editorId);
//       const isRedo = tx.source === TxOrigin.redo(this.editorId);
//       if (isUndo || isRedo) continue;
//       filtered.push(tx);
//     }
//     if (filtered.length === 0) return;

//     const currentTimestamp = Date.now();
//     const timeSinceLastItem = currentTimestamp - this.lastItemTimestamp;

//     // 如果时间间隔小于阈值且存在上一个 item，则合并到上一个 item
//     if (timeSinceLastItem < this.mergeThreshold && this.undoStack.length > 0) {
//       const lastItem = this.undoStack[this.undoStack.length - 1];
//       lastItem.push(...filtered);
//     } else {
//       // 否则创建新的 item
//       this.undoStack.push(filtered);

//       // 限制栈大小
//       while (this.undoStack.length > this.maxStackSize) {
//         this.undoStack.shift();
//       }
//     }

//     // 更新时间戳
//     this.lastItemTimestamp = currentTimestamp;

//     // 任何新的编辑操作都清空重做栈
//     this.redoStack.length = 0;
//   }

//   undo(): boolean {
//     const stackItem = this.undoStack.pop();
//     if (stackItem == null) return false;

//     try {
//       const inverseStackItem = this.doInverse(stackItem, "undo");
//       this.redoStack.push(inverseStackItem);
//       // 撤销操作后重置时间戳，避免与后续操作意外合并
//       this.lastItemTimestamp = 0;
//       return true;
//     } catch (error) {
//       // 如果撤销失败，恢复栈状态
//       this.undoStack.push(stackItem);
//       console.error("撤销操作失败:", error);
//       return false;
//     }
//   }

//   redo(): boolean {
//     const stackItem = this.redoStack.pop();
//     if (stackItem == null) return false;

//     try {
//       const inverseStackItem = this.doInverse(stackItem, "redo");
//       this.undoStack.push(inverseStackItem);
//       // 重做操作后重置时间戳，避免与后续操作意外合并
//       this.lastItemTimestamp = 0;
//       return true;
//     } catch (error) {
//       // 如果重做失败，恢复栈状态
//       this.redoStack.push(stackItem);
//       console.error("重做操作失败:", error);
//       return false;
//     }
//   }

//   canUndo(): boolean {
//     return this.undoStack.length > 0;
//   }

//   canRedo(): boolean {
//     return this.redoStack.length > 0;
//   }

//   private doInverse(
//     stackItem: StackItem,
//     operation: "undo" | "redo"
//   ): StackItem {
//     const inverseStackItem: StackItem = [];
//     for (let i = stackItem.length - 1; i >= 0; i--) {
//       const tx = stackItem[i];
//       const inverseTx = this.storage.createTransaction();
//       inverseTx.source =
//         operation === "undo"
//           ? TxOrigin.undo(this.editorId)
//           : TxOrigin.redo(this.editorId);

//       // 执行逆操作
//       for (let j = tx.ops.length - 1; j >= 0; j--) {
//         const op = tx.ops[j];
//         if (op.type === "add") {
//           inverseTx.deleteBlock(op.block.get().id);
//         } else if (op.type === "update") {
//           const oldBlock = op.oldBlock.get();
//           inverseTx.updateBlock({
//             id: oldBlock.id,
//             parentId: oldBlock.parentId,
//             fractionalIndex: oldBlock.fractionalIndex,
//             content: oldBlock.content,
//             folded: oldBlock.folded,
//           });
//         } else if (op.type === "delete") {
//           const deletedBlock = op.deletedBlock.get();
//           inverseTx.addBlock({
//             id: deletedBlock.id,
//             type: deletedBlock.type,
//             parentId: deletedBlock.parentId,
//             fractionalIndex: deletedBlock.fractionalIndex,
//             content: deletedBlock.content,
//             folded: deletedBlock.folded,
//           });
//         }
//       }

//       // 恢复选区
//       if (tx.metadata.beforeSelection) {
//         inverseTx.metadata.selection = tx.metadata.beforeSelection;
//       }

//       if (tx.metadata.selection) {
//         inverseTx.metadata.beforeSelection = tx.metadata.selection;
//       }

//       inverseStackItem.push(inverseTx.commit());
//     }
//     return inverseStackItem;
//   }
// }
