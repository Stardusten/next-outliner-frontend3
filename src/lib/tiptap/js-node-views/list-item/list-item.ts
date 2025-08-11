import {
  type NodeViewRenderer,
  type NodeViewRendererProps,
} from "@tiptap/core";
import { html } from "../html";
import { getDotDiv } from "./dot";
import { getTriangleDiv } from "./triangle";
import { type NodeView } from "@tiptap/pm/view";
import {
  convertToSearchBlock,
  convertToTagBlock,
  toggleFocusedFoldState,
} from "@/lib/app-views/editable-outline/commands";
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
  Repeat,
  Tag,
  Search,
} from "lucide-vue-next";
import { i18n } from "@/main";
import Markdown from "@/components/icons/Markdown.vue";
import Html from "@/components/icons/Html.vue";
import { toMarkdown } from "@/lib/common/markdown";
import { clipboard } from "@/lib/common/clipboard";
import { recursiveDeleteBlock } from "@/lib/app-views/editable-outline/commands";
import { getHashtagDiv } from "./hashtag";
import { getSearchDiv } from "./search";
import type { BlockId } from "@/lib/common/types";
import { toast } from "vue-sonner";

class ListItemNodeView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  props: NodeViewRendererProps;
  inRefsAndTagsWatchHandle?: WatchHandle;

  constructor(props: NodeViewRendererProps) {
    this.props = props;
    const { node } = props;
    const isText = node.attrs.type === "text";
    const showPath = node.attrs.showPath === true;

    const contentEl = html({
      tag: "div",
      classes: ["list-item-content"],
    });

    const foldBtnEl = getTriangleDiv("fold-btn");
    foldBtnEl.addEventListener("click", this.handleClickFoldBtn.bind(this));

    const bulletEl =
      node.attrs.type === "tag"
        ? getHashtagDiv("bullet")
        : node.attrs.type === "search"
          ? getSearchDiv("bullet")
          : getDotDiv("bullet");
    bulletEl.addEventListener("click", this.handleClickBullet.bind(this));
    bulletEl.addEventListener(
      "contextmenu",
      this.handleRightClickBullet.bind(this)
    );

    const leftEl = html({
      tag: "div",
      classes: ["list-item-left"],
      children: [foldBtnEl, bulletEl],
      attrs: { contentEditable: "false" },
    });

    const refCounterEl = isText
      ? html({
          tag: "div",
          classes: ["ref-counter"],
          attrs: { contentEditable: "false" },
        })
      : undefined;

    let pathEl: HTMLElement | undefined;
    if (showPath) {
      const app = props.editor.appView.app;
      const path = app.getBlockPath(node.attrs.blockId);
      if (path != null && path.length > 0) {
        const text = path
          .map((blockId) => app.getTextContent(blockId))
          .join(" / ");
        pathEl = html({
          tag: "div",
          classes: ["path"],
          children: [document.createTextNode(text)],
          attrs: { contentEditable: "false" },
        });
      }
    }

    const containerEl = html({
      tag: "div",
      styles: { "--level": node.attrs.level },
      classes: [
        "list-item-x",
        node.attrs.folded ? "folded" : "",
        node.attrs.hasChildren ? "has-children" : "",
        node.attrs.isSearchResultRoot ? "is-search-result-root" : "",
        node.attrs.type,
        showPath ? "show-path" : "",
        `level-${node.attrs.level}`,
      ],
      dataset: {
        blockId: node.attrs.blockId,
      },
      // 仅当是文本块时，才显示引用计数器
      // 因为：
      // - 搜索块和代码块不应该被引用，不需要引用计数器
      // - 标签块布局和文本块不同，如果在这里渲染引用计数器会产生错乱，因此放到 TagView 里渲染
      children: [leftEl, contentEl, refCounterEl, pathEl],
    });

    this.dom = containerEl;
    this.contentDOM = contentEl;

    // 放在这里绑定，否则 this.dom 还没赋值
    refCounterEl && this.bindRefCounter(refCounterEl);
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
    const blockId = node.attrs.blockId as BlockId;

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
            action: () => {
              const markdown = toMarkdown(editor.appView.app, [blockId]);
              clipboard.writeText(markdown);
              toast.success(t("blockContextMenu.copiedMarkdownToClipboard"));
            },
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
        type: "submenu",
        icon: Repeat,
        label: t("blockContextMenu.convertTo"),
        children: [
          {
            type: "item",
            icon: Tag,
            label: t("blockContextMenu.convertToTag"),
            action: () => {
              const blockId = node.attrs.blockId;
              const cmd = convertToTagBlock(editor, blockId);
              editor.appView.execCommand(cmd, true);
            },
          },
          {
            type: "item",
            icon: Search,
            label: t("blockContextMenu.convertToSearch"),
            action: () => {
              const blockId = node.attrs.blockId;
              const cmd = convertToSearchBlock(editor, undefined, blockId);
              editor.appView.execCommand(cmd, true);
            },
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
