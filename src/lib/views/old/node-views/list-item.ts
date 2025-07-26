import type { BlockId } from "@/lib/common/types";
import type { EditorView, NodeView } from "prosemirror-view";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import { schema } from "../editor";
import type { Observable } from "@/lib/common/observable";
import type { App } from "@/lib/app/app";
import { getInRefs } from "@/lib/app/index/in-refs";
import { stringToUnicode } from "@/lib/utils";
import { iconSearch } from "./icons/search";
import { iconDot } from "./icons/dot";
import { iconTriangle } from "./icons/triangle";
import { TextSelection } from "prosemirror-state";
import { iconPencil } from "./icons/pencil";
import { ListItem } from "../tiptap-editor/nodes/list-item";

// list-item 三部分：
// - list-item-left
// - list-item-content
// - list-item-right
export function createListItemNodeViewClass(app: App) {
  return class implements NodeView {
    dom: HTMLElement;
    contentDOM: HTMLElement;
    view: EditorView;
    getPos: () => number | undefined;
    // refCounterUnsub: (() => void) | null = null;
    // inRefs: Observable<Set<BlockId>>;

    constructor(
      node: ProseMirrorNode,
      view: EditorView,
      getPos: () => number | undefined
    ) {
      if (node.type.name !== ListItem.name) {
        throw new Error("impossible. list item nodeview get a node" + node);
      }

      this.view = view;
      this.getPos = getPos;

      const el = document.createElement("div");

      // classes
      el.classList.add("list-item");

      // data attributes
      el.dataset.level = node.attrs.level;
      el.dataset.blockId = node.attrs.blockId;
      el.dataset.folded = String(node.attrs.folded);
      el.dataset.hasChildren = String(node.attrs.hasChildren);
      el.dataset.type = node.attrs.type;
      el.dataset.isSearchResultRoot = String(node.attrs.isSearchResultRoot);

      // style variables
      el.style.setProperty("--level", node.attrs.level);

      const listItemLeft = this.getListItemLeft(node);
      const listItemContent = this.getListItemContent();
      const listItemRight = this.getListItemRight(node);

      // const refCounter = document.createElement("div");
      // refCounter.classList.add("ref-counter");
      // this.inRefs = getInRefs(app, node.attrs.blockId);

      // this.refCounterUnsub = this.inRefs.subscribe(
      //   (refs) => {
      //     const nref = refs.size;
      //     refCounter.dataset.nref = nref.toString();
      //     refCounter.innerText = nref.toString();

      //     if (nref > 0) {
      //       el.classList.add("has-in-refs");
      //     }
      //   },
      //   { immediate: true }
      // );

      el.appendChild(listItemLeft);
      el.appendChild(listItemContent);
      // el.appendChild(refCounter);
      el.appendChild(listItemRight);

      this.dom = el;
      this.contentDOM = listItemContent;
    }

    getListItemLeft(node: ProseMirrorNode) {
      const listItemLeft = document.createElement("div");
      listItemLeft.contentEditable = "false";
      listItemLeft.classList.add("list-item-left");
      listItemLeft.appendChild(iconTriangle("fold-btn"));

      const icon =
        node.attrs.type === "search"
          ? iconSearch(["bullet", "search-bullet"])
          : iconDot("bullet");
      listItemLeft.appendChild(icon);

      return listItemLeft;
    }

    getListItemContent() {
      const content = document.createElement("div");
      content.classList.add("list-item-content");
      return content;
    }

    getListItemRight(node: ProseMirrorNode) {
      const listItemRight = document.createElement("div");
      listItemRight.classList.add("list-item-right");

      const content = this.getListItemRightContent(node);
      listItemRight.appendChild(content);

      const pad = document.createElement("div");
      pad.classList.add("list-item-right-pad");
      listItemRight.appendChild(pad);

      // 点击 pad 时，聚焦到对应节点的末尾
      pad.addEventListener("click", () => {
        const nodePos = this.getPos();
        if (!nodePos) return;
        const node = this.view.state.doc.nodeAt(nodePos);
        if (!node) return;
        const doc = this.view.state.doc;
        const $pos = doc.resolve(nodePos + node.nodeSize);
        const sel = TextSelection.findFrom($pos, -1);
        if (!sel) return;
        const tr = this.view.state.tr;
        tr.setSelection(sel);
        this.view.dispatch(tr);
      });

      return listItemRight;
    }

    getListItemRightContent(node: ProseMirrorNode) {
      const content = document.createElement("div");
      content.contentEditable = "false";
      content.classList.add("list-item-right-content");

      // 如果是搜索节点，需要在 content 右边显示一个编辑按钮
      // 和搜索结果计数
      // 这些东西都放在 list-item-right-content 中
      if (node.attrs.type === "search") {
        const editBtn = document.createElement("button");
        editBtn.classList.add("edit-btn");
        editBtn.appendChild(iconPencil());
        content.appendChild(editBtn);

        editBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
      }

      return content;
    }

    destroy() {
      // if (this.refCounterUnsub) {
      //   this.refCounterUnsub();
      // }
      this.dom.remove();
    }
  };
}
