import type { AppEvents } from "@/lib/app/app";
import type { TiptapEditorView } from "../tiptap-editor/editor-view";
import type { SelectionInfo } from "@/lib/common/types";
import type { TxExecutedOperation } from "@/lib/app/tx";
import { Node } from "@tiptap/pm/model";
import { getBlockNode } from "@/lib/app/block-manage";
import { renderBlock } from "./basic-outline";

export function incrementalUpdate(
  view: TiptapEditorView,
  tx: AppEvents["tx-committed"]
) {
  const hasMoreThanOneDeleteOp =
    tx.executedOps.filter((op) => op.type === "block:delete").length > 1;
  if (hasMoreThanOneDeleteOp) {
    throw new Error("More than one delete op, fallback to full update");
  }
  for (const op of tx.executedOps) {
    if (op.type === "block:create") {
      handleBlockCreateOp(
        view,
        op as TxExecutedOperation & { type: "block:create" }
      );
    } else if (op.type === "block:update") {
      handleBlockUpdateOp(
        view,
        op as TxExecutedOperation & { type: "block:update" }
      );
    } else if (op.type === "block:delete") {
      handleBlockDeleteOp(
        view,
        op as TxExecutedOperation & { type: "block:delete" }
      );
    } else if (op.type === "block:move") {
      handleBlockMoveOp(
        view,
        op as TxExecutedOperation & { type: "block:move" }
      );
    } else {
      throw new Error((op as any).type + " not implemented");
    }
  }
}

function handleBlockCreateOp(
  view: TiptapEditorView,
  op: TxExecutedOperation & { type: "block:create" }
) {
  if (!view.tiptap) return;
  const tr = view.tiptap.state.tr;
  const content = tr.doc.content.content;

  let pos = -1,
    parentIndex = -1,
    parentLevel = -1;
  if (op.parent) {
    for (let i = 0, p = 0; i < content.length; i++) {
      const listItem = content[i];
      const { blockId, level } = listItem.attrs;
      if (blockId === op.parent) {
        pos = p + listItem.nodeSize;
        parentIndex = i;
        parentLevel = level;
        break;
      }
      p += listItem.nodeSize;
    }
  } else {
    pos = 0;
    parentIndex = -1;
  }
  // 此时 pos 指向父块末尾

  if (pos === -1) throw new Error("Block not found for create: " + op.blockId);

  // 使用与移动操作相同的跳过逻辑
  let skipped = 0;
  let i = parentIndex + 1;
  let p = pos;

  while (i < content.length) {
    const listItem = content[i];
    const { level } = listItem.attrs;

    if (level === parentLevel + 1) {
      // 检查是否要在这个块前面插入
      if (skipped === op.index) {
        pos = p;
        break;
      }

      // 跳过这个直接子块
      skipped++;

      // 跳过后再检查是否已达到目标位置
      if (skipped === op.index) {
        // 需要移动到这个块（及其子块）的末尾
        let blockEndPos = p + listItem.nodeSize;
        let j = i + 1;
        while (j < content.length) {
          const childItem = content[j];
          if (childItem.attrs.level <= parentLevel + 1) break;
          blockEndPos += childItem.nodeSize;
          j++;
        }
        pos = blockEndPos;
        break;
      }
    } else if (level <= parentLevel) {
      // 如果遇到同级或更高级，说明已经超出了父块的范围
      break;
    } else {
      // 跳过后代块
    }

    p += listItem.nodeSize;
    i++;
  }

  // 如果循环结束但还没达到目标位置，说明要插入到最后
  if (i === content.length || content.length === 0) {
    console.log(
      `循环结束，插入到最后: i=${i}, content.length=${content.length}, 最终pos=${p}`
    );
    pos = p;
  }

  console.log(`最终插入位置: pos=${pos}`);
  // 此时 pos 指向插入位置

  const blockNode = getBlockNode(view.app, op.blockId);
  if (blockNode == null) throw new Error("Block not found: " + op.blockId);
  const [node] = renderBlock({
    editor: view,
    blockNode,
    level: parentLevel + 1,
    rootOnly: true,
  });
  tr.insert(pos, node);
  view.tiptap.view.dispatch(tr);
}

function handleBlockUpdateOp(
  view: TiptapEditorView,
  op: TxExecutedOperation & { type: "block:update" }
) {
  if (!view.tiptap) return;
  const tr = view.tiptap.state.tr;
  const content = tr.doc.content.content;

  // 找到要更新的块
  let pos = -1;
  let listItemIndex = -1;
  for (let i = 0, p = 0; i < content.length; i++) {
    const listItem = content[i];
    const { blockId } = listItem.attrs;
    if (blockId === op.blockId) {
      pos = p;
      listItemIndex = i;
      break;
    }
    p += listItem.nodeSize;
  }

  if (pos === -1 || listItemIndex === -1) {
    throw new Error("Block not found for update: " + op.blockId);
  }

  const listItem = content[listItemIndex];
  const level = listItem.attrs.level;

  // 计算包含所有子级的范围（参考 handleBlockMoveOp）
  let replaceTo = pos + listItem.nodeSize;

  // 跳过所有子级
  for (let i = listItemIndex + 1, p = replaceTo; i < content.length; i++) {
    const childItem = content[i];
    const { level: childLevel } = childItem.attrs;
    if (childLevel <= level) break; // 遇到同级或更高级，停止
    replaceTo = p + childItem.nodeSize;
    p += childItem.nodeSize;
  }

  // 重新渲染整个子树
  const blockNode = getBlockNode(view.app, op.blockId);
  if (blockNode == null) throw new Error("Block not found: " + op.blockId);

  const newNodes = renderBlock({
    editor: view,
    blockNode,
    level,
    rootOnly: false, // 渲染完整子树
  });

  // 替换整个范围
  tr.replaceWith(pos, replaceTo, newNodes);
  view.tiptap.view.dispatch(tr);
}

function handleBlockDeleteOp(
  view: TiptapEditorView,
  op: TxExecutedOperation & { type: "block:delete" }
) {
  if (!view.tiptap) return;
  const tr = view.tiptap.state.tr;
  const content = tr.doc.content.content;

  // 找到要删除的块
  let pos = -1;
  let listItem: Node | null = null;
  for (let i = 0, p = 0; i < content.length; i++) {
    const listItem_ = content[i];
    const { blockId } = listItem_.attrs;
    if (blockId === op.blockId) {
      pos = p;
      listItem = listItem_;
      break;
    }
    p += listItem_.nodeSize;
  }

  if (pos === -1 || listItem == null)
    throw new Error("Block not found for delete: " + op.blockId);

  // 删除单个块
  tr.delete(pos, pos + listItem.nodeSize);
  view.tiptap.view.dispatch(tr);
}

function handleBlockMoveOp(
  view: TiptapEditorView,
  op: TxExecutedOperation & { type: "block:move" }
) {
  if (!view.tiptap) return;
  let tr = view.tiptap.state.tr;
  let content = tr.doc.content.content;

  // 第一步：找到并删除目标块及其所有后代
  {
    let pos = -1;
    let listItem: Node | null = null;
    let listItemIndex = -1;
    for (let i = 0, p = 0; i < content.length; i++) {
      const listItem_ = content[i];
      const { blockId } = listItem_.attrs;
      if (blockId === op.blockId) {
        pos = p;
        listItem = listItem_;
        listItemIndex = i;
        break;
      }
      p += listItem_.nodeSize;
    }

    if (pos === -1 || listItem == null || listItemIndex === -1) {
      throw new Error("Block not found for move: " + op.blockId);
    }

    const level = listItem.attrs.level;

    // 计算包含所有子级的范围
    let deleteTo = pos + listItem.nodeSize;

    // 跳过所有子级
    for (let i = listItemIndex + 1, p = deleteTo; i < content.length; i++) {
      const childItem = content[i];
      const { level: childLevel } = childItem.attrs;
      if (childLevel <= level) break; // 遇到同级或更高级，停止
      deleteTo = p + childItem.nodeSize;
      p += childItem.nodeSize;
    }

    tr = tr.delete(pos, deleteTo);
  }

  // 2. 找到插入位置
  // 先找到父块的位置
  {
    content = tr.doc.content.content;

    let pos = -1,
      parentIndex = -1,
      parentLevel = -1;
    if (op.parent) {
      for (let i = 0, p = 0; i < content.length; i++) {
        const listItem = content[i];
        const { blockId, level } = listItem.attrs;
        if (blockId === op.parent) {
          pos = p + listItem.nodeSize;
          parentIndex = i;
          parentLevel = level;
          break;
        }
        p += listItem.nodeSize;
      }
    } else {
      pos = 0;
      parentIndex = -1;
    }
    // 此时 pos 指向父块末尾

    if (pos === -1) throw new Error("Block not found for move: " + op.blockId);

    // 然后跳过 op.index 个子块，注意子块的后代也要跳过
    // 使用改进的跳过逻辑
    let skipped = 0;
    let i = parentIndex + 1;
    let p = pos;

    while (i < content.length) {
      const listItem = content[i];
      const { level } = listItem.attrs;

      if (level === parentLevel + 1) {
        // 检查是否要在这个块前面插入
        if (skipped === op.index) {
          pos = p;
          break;
        }

        // 跳过这个直接子块
        skipped++;

        // 跳过后再检查是否已达到目标位置
        if (skipped === op.index) {
          // 需要移动到这个块（及其子块）的末尾
          let blockEndPos = p + listItem.nodeSize;
          let j = i + 1;
          while (j < content.length) {
            const childItem = content[j];
            if (childItem.attrs.level <= parentLevel + 1) break;
            blockEndPos += childItem.nodeSize;
            j++;
          }
          pos = blockEndPos;
          break;
        }
      } else if (level <= parentLevel) {
        // 如果遇到同级或更高级，说明已经超出了父块的范围
        break;
      }

      p += listItem.nodeSize;
      i++;
    }

    // 如果循环结束但还没达到目标位置，说明要插入到最后
    if (i === content.length || content.length === 0) {
      pos = p;
    }

    const blockNode = getBlockNode(view.app, op.blockId);
    if (blockNode == null) throw new Error("Block not found: " + op.blockId);
    const newNodes = renderBlock({
      editor: view,
      blockNode,
      level: parentLevel + 1,
      rootOnly: false, // 渲染完整子树
    });
    tr.insert(pos, newNodes);
  }

  view.tiptap.view.dispatch(tr);
}
