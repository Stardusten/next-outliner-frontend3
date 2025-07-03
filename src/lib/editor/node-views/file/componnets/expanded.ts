import type { Node as ProseMirrorNode } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";
import type { App } from "@/lib/app/app";
import {
  fileIcon,
  formatFileSize,
  getFileType,
  getFileTypeText,
  parseFileStatus,
} from "../common";
import { h } from "./h";
import { changeFileDisplayMode } from "@/lib/editor/commands";

// 渲染文件图标
function fileIconEl(filename: string, type?: string): HTMLElement {
  return h("div", {
    className: "file-icon",
    style: `
      flex-shrink: 0;
      color: var(--color-block-ref);
      display: flex;
      align-items: center;
      justify-content: center;
    `,
    innerHTML: fileIcon(filename, type),
  });
}

// 渲染文件详情
function fileDetails(
  filename: string,
  type: string,
  size: number
): HTMLElement {
  const fileName = h("div", {
    className: "file-name",
    style: `
      font-size: var(--ui-font-size);
      font-weight: 500;
      color: var(--menu-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 150px;
      text-overflow: ellipsis;
    `,
    textContent: filename,
  });

  const fileMeta = h(
    "div",
    {
      className: "file-meta",
      style: `
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: var(--ui-font-size-small);
        color: var(--menu-text-muted);
        line-height: 1.4;
        margin-bottom: 2px;
      `,
    },
    h("span", {
      className: "file-type",
      textContent: getFileTypeText(getFileType(filename)),
    }),
    h("span", {
      className: "file-separator",
      style: "color: var(--border-color)",
      textContent: "•",
    }),
    h("span", {
      className: "file-size",
      textContent: formatFileSize(size),
    })
  );

  return h(
    "div",
    {
      className: "file-details",
      style: `
        flex: 1;
        min-width: 0;
      `,
    },
    fileName,
    fileMeta
  );
}

// 渲染操作按钮
function actionButton(
  className: string,
  iconSvg: string,
  onClick?: (e: MouseEvent) => void
): HTMLElement {
  return h("button", {
    className: `file-action-btn ${className}`,
    style: `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      border-radius: 4px;
      color: var(--color-text-muted);
      cursor: pointer;
      transition: all 0.15s ease;
    `,
    innerHTML: iconSvg,
    listeners: {
      mouseenter() {
        this.style.background = "var(--color-bg-hover)";
        this.style.color = "var(--color-text)";
      },
      mouseleave() {
        this.style.background = "transparent";
        this.style.color = "var(--color-text-muted)";
      },
      click(e: Event) {
        e.stopPropagation();
        if (onClick) {
          onClick(e as MouseEvent);
        }
      },
    },
  });
}

// 渲染操作区域
function actions(
  app: App,
  view: EditorView,
  node: ProseMirrorNode,
  getPos: () => number
): HTMLElement {
  const { filename, path, type, size } = node.attrs;

  const previewIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>`;

  const moreIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="1"/>
    <circle cx="19" cy="12" r="1"/>
    <circle cx="5" cy="12" r="1"/>
  </svg>`;

  // 处理预览按钮点击
  const handlePreview = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // TODO: 实现预览按钮功能
  };

  // 处理更多操作按钮点击
  const handleMore = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 动态导入 composable 和图标
    import("@/composables").then(({ useContextMenu }) => {
      const contextMenu = useContextMenu();

      // 动态导入图标
      Promise.all([
        import("lucide-vue-next").then((icons) => icons.ArrowRight),
        import("lucide-vue-next").then((icons) => icons.Download),
        import("lucide-vue-next").then((icons) => icons.Info),
      ]).then(([ArrowRightIcon, DownloadIcon, InfoIcon]) => {
        const menuItems = [
          {
            icon: ArrowRightIcon,
            label: "转为引用",
            action: () => {
              const pos = getPos();
              const command = changeFileDisplayMode(pos, "inline");
              command(view.state, view.dispatch);
            },
          },
          {
            icon: ArrowRightIcon,
            label: "转为预览",
            action: () => {
              const pos = getPos();
              const command = changeFileDisplayMode(pos, "preview");
              command(view.state, view.dispatch);
            },
          },
          { type: "divider" } as const,
          {
            icon: DownloadIcon,
            label: "下载文件",
            action: async () => {
              try {
                if (app.attachmentStorage == null) return;
                const blob = await app.attachmentStorage.download(path);
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
              } catch (error) {
                console.error("下载文件失败:", error);
              }
            },
          },
          {
            icon: InfoIcon,
            label: "详细信息",
            action: () => {
              // 显示文件详细信息
              const info = [
                `文件名: ${filename}`,
                `类型: ${getFileTypeText(getFileType(filename))}`,
                `大小: ${formatFileSize(size)}`,
                `路径: ${path}`,
              ].join("\n");
              alert(info);
            },
          },
        ];

        contextMenu.handleContextMenu(e, { items: menuItems });
      });
    });
  };

  return h(
    "div",
    {
      className: "file-actions",
      style: `
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
        margin-left: auto;
      `,
    },
    actionButton("preview-btn", previewIcon, handlePreview),
    actionButton("more-btn", moreIcon, handleMore)
  );
}

export function fileExpanded(
  app: App,
  view: EditorView,
  node: ProseMirrorNode,
  getPos: () => number
): HTMLElement {
  const { filename, type, size, status } = node.attrs;

  const container = h(
    "div",
    {
      className: "file-info",
      style: `
        display: inline-flex;
        align-items: center;
        gap: 12px;
        padding: 4px 8px;
        background: var(--color-bg-muted);
        border-radius: 6px;
        border: 1px solid var(--border-color-muted);
        margin: 4px 0;
        transition: background-color 0.15s ease;
        cursor: pointer;
        max-width: 400px;
      `,
    },
    fileIconEl(filename, type),
    fileDetails(filename, type, size),
    actions(app, view, node, getPos)
  );
  return container;
}
