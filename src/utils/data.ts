import type { Block } from "../lib/blocks/types";
import type { BlockStorage } from "../lib/storage/interface";

// 初始化数据到存储
export function initializeBlockStorage(storage: BlockStorage) {
  // 检查根块是否存在，如果存在则认为已经初始化
  if (storage.getRootBlocks().length === 0) {
    const initialBlocks: Block[] = [
      {
        id: "1",
        type: "text",
        parentId: null,
        fractionalIndex: 1,
        content: JSON.stringify({
          type: "paragraph",
          content: [{ type: "text", text: "第一个项目" }],
        }),
        textContent: "第一个项目",
        folded: false,
      },
      {
        id: "2",
        type: "text",
        parentId: "1",
        fractionalIndex: 1,
        content: JSON.stringify({
          type: "paragraph",
          content: [{ type: "text", text: "子项目 1" }],
        }),
        textContent: "子项目 1",
        folded: false,
      },
      {
        id: "3",
        type: "text",
        parentId: "1",
        fractionalIndex: 2,
        content: JSON.stringify({
          type: "paragraph",
          content: [{ type: "text", text: "子项目 2" }],
        }),
        textContent: "子项目 2",
        folded: false,
      },
      {
        id: "4",
        type: "text",
        parentId: "2",
        fractionalIndex: 1,
        content: JSON.stringify({
          type: "paragraph",
          content: [{ type: "text", text: "嵌套子项目" }],
        }),
        textContent: "嵌套子项目",
        folded: false,
      },
      {
        id: "5",
        type: "text",
        parentId: null,
        fractionalIndex: 2,
        content: JSON.stringify({
          type: "paragraph",
          content: [{ type: "text", text: "第二个项目" }],
        }),
        textContent: "第二个项目",
        folded: false,
      },
    ];

    // 在 in-memory-impl 的构造函数中直接处理初始化
    // 这个函数现在可以用于其他需要批量添加块的场景
    // 这里我们假设 storage 是空的，所以可以直接 add
    initialBlocks.forEach((block) => storage.addBlock(block));
    console.log("Initialized storage with default blocks");
  } else {
    console.log(`Storage already has blocks, skipping initialization`);
  }
}
