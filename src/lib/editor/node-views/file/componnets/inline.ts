import type { Node as ProseMirrorNode } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";
import type { App } from "@/lib/app/app";
import {
  fileIcon,
  getStatusIcon,
  parseFileStatus,
  getFileType,
  getFileTypeText,
  formatFileSize,
} from "../common";
import { h } from "./h";
import { changeFileDisplayMode } from "@/lib/editor/commands";

export function fileInline(
  app: App,
  view: EditorView,
  node: ProseMirrorNode,
  getPos: () => number
): HTMLElement {
  const { filename, type, status, path, size } = node.attrs;

  // 使用 common.ts 中的状态解析函数
  const parsedStatus = parseFileStatus(status);

  const textContent =
    parsedStatus.type === "uploading"
      ? `${filename} (上传中 ${parsedStatus.progress || 0}%)`
      : parsedStatus.type === "failed"
        ? `${filename} (上传失败)`
        : filename;

  const icon =
    parsedStatus.type === "uploading" || parsedStatus.type === "failed"
      ? getStatusIcon(parsedStatus, 15)
      : fileIcon(filename, type, 15);

  // 处理右键菜单事件
  const handleContextMenu = (e: MouseEvent) => {
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
            type: "item",
            icon: ArrowRightIcon,
            label: "转为卡片",
            action: () => {
              const pos = getPos();
              const command = changeFileDisplayMode(pos, "expanded");
              command(view.state, view.dispatch);
            },
          } as const,
          {
            type: "item",
            icon: ArrowRightIcon,
            label: "转为预览",
            action: () => {
              const pos = getPos();
              const command = changeFileDisplayMode(pos, "preview");
              command(view.state, view.dispatch);
            },
          } as const,
          { type: "divider" } as const,
          {
            type: "item",
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
          } as const,
          {
            type: "item",
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
          } as const,
        ];

        contextMenu.show(e.clientX, e.clientY, menuItems);
      });
    });
  };

  return h(
    "span",
    {
      className: `file-inline ${status}`,
      style: `
        cursor: pointer;
        user-select: none;
      `,
      listeners: {
        contextmenu: handleContextMenu,
      },
    },
    // 文件图标（根据状态显示不同图标）
    h("span", {
      style: `
        display: inline-block;
        transform: translateY(1px);
        margin-right: 2px;
      `,
      innerHTML: icon,
    }),
    // 文件名和状态文字
    h("span", { textContent })
  );
}
