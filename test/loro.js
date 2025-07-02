import { LoroDoc, LoroMap } from "loro-crdt";

// const doc = new LoroDoc();
// const tree = doc.getTree("tree");

// let beforeFrontiers = doc.frontiers();
// tree.subscribe(async (eb) => {
//   // 如果事件是由 checkout 触发的，则不处理
//   if (eb.by === "checkout") return;

//   const currFrontiers = doc.frontiers();
//   for (const e of eb.events) {
//     if (e.diff.type === "map") {
//       const blockId = e.path[1];
//       doc.checkout(beforeFrontiers);
//       const oldData = doc.getTree("tree").getNodeByID(blockId)?.data.toJSON();
//       console.log("oldData=", oldData);
//       doc.checkoutToLatest();
//       const newData = e.diff.updated;
//       console.log("newData=", newData);
//     }
//   }
//   beforeFrontiers = currFrontiers;
// });

// (async () => {
//   const node1 = tree.createNode();
//   const node2 = node1.createNode();
//   node2.data.set("content", "hello world");
//   node2.data.set("content", "hello world, again!");
//   doc.commit();
//   await new Promise((resolve) => setTimeout(resolve));
//   node2.data.set("content", "hello kris!");
//   doc.commit();
//   await new Promise((resolve) => setTimeout(resolve));
// })();

const doc = new LoroDoc();

const text = doc.getText("text");
text.insert(0, "Hello World");
const v1 = doc.frontiers();
console.log(v1);
text.insert(0, "Kris, Good morning!");

doc.checkout(v1);
doc.attach();
doc.revertTo(v1);
console.log(doc.isDetached());
console.log(doc.frontiers());
