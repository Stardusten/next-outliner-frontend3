import { LoroTree } from "loro-crdt";
import { AsyncTaskQueue } from "../src/lib/common/taskQueue";
import { withTx } from "../src/lib/app/tx";
import type { BlockId, BlockDataInner } from "../src/lib/common/types";

(async () => {
  // 构造一个最简 App Mock，仅满足事务相关函数的依赖
  function createMockApp() {
    const tree = new LoroTree();
    const doc = { commit: () => {} } as any;
    const txQueue = new AsyncTaskQueue();
    const app: any = {
      tree,
      doc,
      txQueue,
      emit: () => {},
      editors: {},
      lastFocusedEditorId: null,
    };
    return app;
  }

  const app = createMockApp();
  const { tree } = app;

  // 创建两个根节点，其中 A 作为测试的父节点
  const A = tree.createNode();

  const data: BlockDataInner = {
    folded: false,
    type: "text",
    content: "",
  };

  await withTx(app, (tx) => {
    // 初始状态
    console.log(tx.getChildrenIds(A.id as BlockId));

    // 插入第一个子节点
    const c1 = tx.createBlock(A.id as BlockId, 0, data);
    console.log(tx.getChildrenIds(A.id as BlockId));
    console.log(tx.getIndex(c1));

    // 插入第二个子节点
    const c2 = tx.createBlock(A.id as BlockId, 1, data);
    console.log(tx.getChildrenIds(A.id as BlockId));
    console.log(tx.getIndex(c2));

    // 移动第一个子节点到索引 1
    tx.moveBlock(c1, A.id as BlockId, 1);
    console.log(tx.getChildrenIds(A.id as BlockId));
    console.log(tx.getIndex(c1));
    console.log(tx.getIndex(c2));

    // 删除第二个子节点
    tx.deleteBlock(c2);
    console.log(tx.getChildrenIds(A.id as BlockId));
    console.log(tx.getIndex(c1));
    console.log(tx.getIndex(c2));
  });
})();
