import type { App } from "@/lib/app/app";
import { getBlockNode } from "@/lib/app/block-manage";
import type { BlockId } from "@/lib/common/types";
import { Editor as TiptapEditor } from "@tiptap/vue-3";
import { nanoid } from "nanoid";
import { schema } from "../tiptap-editor/editor-view";
import { HighlightMatches } from "../tiptap-editor/functionalities/highlight-matches";
import { markExtensions } from "../tiptap-editor/marks";
import { nodeExtensions } from "../tiptap-editor/nodes";
import { pmNodeFromBlockData } from "../utils";
import type { AppView, AppViewId } from "../view";

export class ReadonlyBlockView implements AppView {
  id: AppViewId;
  blockId: BlockId;
  app: App;
  tiptap: TiptapEditor | null;
  highlightTerms: string[];

  constructor(app: App, blockId: BlockId, viewId?: AppViewId) {
    this.id = viewId ?? nanoid();
    this.blockId = blockId;
    this.app = app;
    this.tiptap = null;
    this.highlightTerms = [];
  }

  mount(el: HTMLElement): void {
    const blockNode = getBlockNode(this.app, this.blockId)!; // TODO
    const { doc: docType } = schema.nodes;
    const deserialized = pmNodeFromBlockData(blockNode, 0, this.app);
    const doc = docType.create({}, [deserialized]);

    this.tiptap = new TiptapEditor({
      element: el,
      content: doc.toJSON(), // TODO 序列化反序列化多次
      editable: false,
      extensions: [...nodeExtensions, ...markExtensions, HighlightMatches],
    });
    // @ts-ignore
    this.tiptap.appView = this; // TODO bad idea!

    this.updateHighlightTerms(); // 初始化高亮
  }

  unmount(): void {
    this.tiptap?.destroy();
    this.tiptap = null;
  }

  updateHighlightTerms(terms?: string[]) {
    if (terms != null) this.highlightTerms = terms;
    if (this.tiptap) {
      const tr = this.tiptap.state.tr;
      tr.setMeta("highlightTerms", terms);
      this.tiptap.view.dispatch(tr);
    }
  }

  hasFocus(): boolean {
    return this.tiptap != null && this.tiptap.isFocused;
  }

  // 空实现
  on(args: any) {}
  off(args: any) {}
}
