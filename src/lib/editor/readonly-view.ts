import { EditorView } from "prosemirror-view";
import { createBlockRefNodeViewClass } from "./node-views/block-ref";
import type { BlockStorage } from "../storage/interface";
import { EditorState as ProseMirrorState } from "prosemirror-state";
import type { BlockId } from "../blocks/types";
import { outlinerSchema } from "./schema";
import { createStateFromStorage } from "./utils";
import { createHighlightMatchesPlugin } from "./plugins/highlight-matches";
import { createListItemNodeViewClass } from "./node-views/list-item";

export class ReadonlyBlockView {
  private blockId: BlockId;
  private storage: BlockStorage;
  private view?: EditorView;
  private highlightTerms: string[];

  constructor(storage: BlockStorage, blockId: BlockId) {
    this.storage = storage;
    this.blockId = blockId;
    this.highlightTerms = [];
  }

  updateHighlightTerms(terms?: string[]) {
    if (terms != null) this.highlightTerms = terms;
    if (this.view) {
      const tr = this.view.state.tr;
      tr.setMeta("highlightTerms", terms);
      this.view.dispatch(tr);
    }
  }

  mount(dom: HTMLElement) {
    if (this.view) {
      this.unmount();
    }
    const doc = createStateFromStorage(this.storage, [this.blockId], true);

    const state = ProseMirrorState.create({
      schema: outlinerSchema,
      plugins: [createHighlightMatchesPlugin(undefined, true)],
      doc,
    });

    const storage = this.storage;
    this.view = new EditorView(dom, {
      state,
      nodeViews: {
        blockRef(node, view, getPos) {
          const clz = createBlockRefNodeViewClass(storage);
          return new clz(node, view, getPos);
        },
        listItem(node, view, getPos) {
          const clz = createListItemNodeViewClass(storage);
          return new clz(node, view, getPos);
        },
      },
      editable: () => false, // 只读
    });

    // 初始化高亮
    this.updateHighlightTerms();
  }

  unmount() {
    if (this.view) {
      this.view.destroy();
      this.view = undefined;
    }
  }
}
