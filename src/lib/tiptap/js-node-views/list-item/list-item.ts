import {
  type NodeViewRenderer,
  type NodeViewRendererProps,
} from "@tiptap/core";
import { html } from "../html";
import { getDotDiv } from "./dot";
import { getTriangleDiv } from "./triangle";
import { type NodeView } from "@tiptap/pm/view";
import { toggleFocusedFoldState } from "@/lib/app-views/editable-outline/commands";
import { getInRefs, getInTags } from "@/lib/app/index/in-refs";
import { watch, type WatchHandle } from "vue";
import { useContextMenu } from "@/composables";
import {
  Copy,
  Clipboard,
  CornerDownRight,
  Link,
  Scissors,
  Text,
  Trash,
} from "lucide-vue-next";
import { i18n } from "@/main";
import Markdown from "@/components/icons/Markdown.vue";
import Html from "@/components/icons/Html.vue";
import { toMarkdown } from "@/lib/common/markdown";
import { clipboard } from "@/lib/common/clipboard";
import { recursiveDeleteBlock } from "@/lib/app-views/editable-outline/commands";

class ListItemNodeView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  props: NodeViewRendererProps;
  inRefsAndTagsWatchHandle?: WatchHandle;

  constructor(props: NodeViewRendererProps) {
    this.props = props;
    const { node } = props;

    const contentEl = html({
      tag: "div",
      classes: ["list-item-content"],
    });

    const foldBtnEl = getTriangleDiv("fold-btn");
    foldBtnEl.addEventListener("click", this.handleClickFoldBtn.bind(this));

    const bulletEl = getDotDiv("bullet");
    bulletEl.addEventListener("click", this.handleClickBullet.bind(this));
    bulletEl.addEventListener(
      "contextmenu",
      this.handleRightClickBullet.bind(this)
    );

    const leftEl = html({
      tag: "div",
      classes: ["list-item-left"],
      children: [foldBtnEl, bulletEl],
    });

    const refCounterEl = html({
      tag: "div",
      classes: ["ref-counter"],
    });

    const containerEl = html({
      tag: "div",
      styles: { "--level": node.attrs.level },
      classes: [
        "list-item-x",
        node.attrs.folded ? "folded" : "",
        node.attrs.hasChildren ? "has-children" : "",
        node.attrs.isSearchResultRoot ? "is-search-result-root" : "",
        node.attrs.type,
        `level-${node.attrs.level}`,
      ],
      dataset: {
        blockId: node.attrs.blockId,
      },
      children: [leftEl, contentEl, refCounterEl],
    });

    this.dom = containerEl;
    this.contentDOM = contentEl;

    // 放在这里绑定，否则 this.dom 还没赋值
    this.bindRefCounter(refCounterEl);
  }

  destroy() {
    this.dom.remove();
    this.contentDOM.remove();
    this.inRefsAndTagsWatchHandle?.stop();
  }

  bindRefCounter(refCounterEl: HTMLElement) {
    const { editor, node } = this.props;
    const dom = this.dom;
    const app = editor.appView.app;
    const blockId = node.attrs.blockId;
    const inRefs = getInRefs(app, blockId);
    const inTags = getInTags(app, blockId);
    this.inRefsAndTagsWatchHandle = watch(
      [inRefs, inTags],
      () => {
        const nInRefs = inRefs.value.size;
        const nInTags = inTags.value.size;
        refCounterEl.textContent = `${nInRefs + nInTags}`;

        if (nInRefs > 0) dom.classList.add("has-inref");
        else dom.classList.remove("has-inref");

        if (nInTags > 0) dom.classList.add("has-intag");
        else dom.classList.remove("has-intag");
      },
      { immediate: true, deep: true }
    );
  }

  handleClickBullet() {
    const { editor, node } = this.props;
    editor.appView.setRootBlockIds([node.attrs.blockId]);
  }

  handleClickFoldBtn() {
    const { editor, node } = this.props;
    const cmd = toggleFocusedFoldState(editor, undefined, node.attrs.blockId);
    editor.appView.execCommand(cmd, true);
  }

  handleRightClickBullet(ev: MouseEvent) {
    const contextmenu = useContextMenu();
    const { t } = i18n.global;
    const { editor, node } = this.props;
    const blockId = node.attrs.blockId as string;

    contextmenu.open(ev, [
      {
        type: "submenu",
        icon: Copy,
        label: t("blockContextMenu.copyAs"),
        children: [
          {
            type: "item",
            icon: Markdown,
            label: t("blockContextMenu.copyAsMarkdown"),
            action: () => {},
          },
          {
            type: "item",
            icon: Text,
            label: t("blockContextMenu.copyAsPureText"),
            action: () => {},
          },
          {
            type: "item",
            icon: Html,
            label: t("blockContextMenu.copyAsHtml"),
            action: () => {},
          },
        ],
      },
      {
        type: "submenu",
        icon: Clipboard,
        label: t("blockContextMenu.pasteAs"),
        children: [
          {
            type: "item",
            icon: Markdown,
            label: t("blockContextMenu.pasteAsMarkdownSingleBlock"),
            action: () => {},
          },
          {
            type: "item",
            icon: Markdown,
            label: t("blockContextMenu.pasteAsMarkdownAutoSplit"),
            action: () => {},
          },
          {
            type: "item",
            icon: Text,
            label: t("blockContextMenu.pasteAsPureTextSingleBlock"),
            action: () => {},
          },
          {
            type: "item",
            icon: Text,
            label: t("blockContextMenu.pasteAsPureTextAutoSplit"),
            action: () => {},
          },
        ],
      },
      {
        type: "item",
        icon: CornerDownRight,
        label: t("blockContextMenu.moveBlock"),
        action: () => {},
      },
      {
        type: "item",
        icon: Link,
        label: t("blockContextMenu.copyBlockRef"),
        action: () => {
          clipboard.writeText(blockId);
        },
      },
      {
        type: "item",
        icon: Scissors,
        label: t("blockContextMenu.cutBlock"),
        action: () => {},
      },
      {
        type: "item",
        icon: Trash,
        label: t("blockContextMenu.delete"),
        danger: true,
        action: this.handleDeleteBlock.bind(this),
      },
    ]);
  }

  handleDeleteBlock() {
    const { editor, node } = this.props;
    const cmd = recursiveDeleteBlock(editor, node.attrs.blockId);
    editor.appView.execCommand(cmd, true);
  }

  handleCopyBlockRef() {
    const { node } = this.props;
    clipboard.writeText(node.attrs.blockId);
  }

  handleCopyAsMarkdown() {
    const { editor, node } = this.props;
    const markdown = toMarkdown(editor.appView.app, [node.attrs.blockId]);
    clipboard.writeText(markdown);
  }
}

export const listItemNodeViewRenderer: NodeViewRenderer = (props) => {
  return new ListItemNodeView(props);
};
