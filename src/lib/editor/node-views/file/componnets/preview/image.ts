import type { App } from "@/lib/app/app";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";
import { h } from "../h";
import { changeFileDisplayMode, setImageWidth } from "@/lib/editor/commands";
import { fileIcon } from "../../common";

// 图片 URL 缓存 - 内存缓存，键为 path，值为 object URL
const imageUrlCache = new Map<string, string>();

// 图片元素
function imageElement(): HTMLImageElement {
  return h("img", {
    style: `
      width: 100%;
      height: auto;
      display: block;
      cursor: pointer;
      border-radius: 8px;
      user-select: none;
      pointer-events: none;
    `,
  }) as HTMLImageElement;
}

// 删除按钮
function deleteButton(onClick: (e: MouseEvent) => void): HTMLElement {
  return h("button", {
    className: "action-btn delete-btn",
    style: `
      width: 24px;
      height: 24px;
      border: none;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.4);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.7;
      transition: opacity 0.2s ease, color 0.2s ease;
    `,
    innerHTML: `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3,6 5,6 21,6"></polyline>
        <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
    `,
    listeners: {
      click: onClick,
      mouseenter: (e) => {
        const btn = e.target as HTMLElement;
        btn.style.opacity = "1";
        btn.style.color = "#ef4444";
      },
      mouseleave: (e) => {
        const btn = e.target as HTMLElement;
        btn.style.opacity = "0.7";
        btn.style.color = "white";
      },
    },
  });
}

// 更多操作按钮
function moreButton(onClick: (e: MouseEvent) => void): HTMLElement {
  return h("button", {
    className: "action-btn more-btn",
    style: `
      width: 24px;
      height: 24px;
      border: none;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.4);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.7;
      transition: opacity 0.2s ease;
    `,
    innerHTML: `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="1"></circle>
        <circle cx="19" cy="12" r="1"></circle>
        <circle cx="5" cy="12" r="1"></circle>
      </svg>
    `,
    listeners: {
      click: onClick,
      mouseenter: (e) => {
        (e.target as HTMLElement).style.opacity = "1";
      },
      mouseleave: (e) => {
        (e.target as HTMLElement).style.opacity = "0.7";
      },
    },
  });
}

// 操作按钮容器
function actionButtons(
  onDelete: (e: MouseEvent) => void,
  onMore: (e: MouseEvent) => void
): HTMLElement {
  const container = h("div", {
    className: "image-actions",
    style: `
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.2s ease;
      z-index: 20;
    `,
  });

  const del = deleteButton(onDelete);
  const more = moreButton(onMore);

  container.appendChild(del);
  container.appendChild(more);

  return container;
}

// 拖拽手柄指示器
function resizeHandleIndicator(): HTMLElement {
  return h("div", {
    style: `
      position: absolute;
      right: 2px;
      top: 0;
      bottom: 0;
      width: 4px;
      background: var(--color-text-muted);
      border-radius: 2px;
      opacity: 0;
      transition: opacity 0.2s ease;
    `,
  });
}

// 拖拽手柄
function createResizeHandler(
  indicator: HTMLElement,
  onMouseDown: (e: MouseEvent) => void
): HTMLElement {
  return h(
    "div",
    {
      className: "resize-handle",
      style: `
        position: absolute;
        right: 4px;
        top: 20%;
        bottom: 20%;
        width: 12px;
        cursor: ew-resize;
        background: transparent;
        z-index: 10;
      `,
      listeners: {
        mousedown: onMouseDown,
      },
    },
    indicator
  );
}

// 设置图片加载器
function setupImageLoader(
  app: App,
  img: HTMLImageElement,
  container: HTMLElement,
  path: string,
  filename: string,
  type: string
): void {
  if (app.attachmentStorage == null) return;
  const loadImage = async () => {
    try {
      // 检查缓存
      let url = imageUrlCache.get(path);
      if (!url) {
        console.log("download", path);
        // 缓存未命中，下载文件并创建 URL
        const blob = await app.attachmentStorage!.download(path);
        url = URL.createObjectURL(blob);
        imageUrlCache.set(path, url);
      }

      img.src = url;
      img.alt = filename;
    } catch (error) {
      container.innerHTML = `
        <div style="
          padding: 16px;
          text-align: center;
          color: var(--color-text-muted);
          font-size: var(--ui-font-size-small);
        ">
          <div style="margin-bottom: 8px;">${fileIcon(filename, type, 24)}</div>
          <div>无法加载图片预览</div>
          <div style="margin-top: 4px; font-size: var(--ui-font-size-tiny);">${filename}</div>
        </div>
      `;
    }
  };

  loadImage();
}

// 设置容器悬停事件
function setupContainerEvents(
  container: HTMLElement,
  indicator: HTMLElement,
  actionButtons: HTMLElement
): void {
  container.addEventListener("mouseenter", () => {
    indicator.style.opacity = "0.6";
    actionButtons.style.opacity = "1";
  });
  container.addEventListener("mouseleave", () => {
    indicator.style.opacity = "0";
    actionButtons.style.opacity = "0";
  });
}

// 拖拽处理器
function resizeHandler(
  app: App,
  view: EditorView,
  path: string,
  container: HTMLElement,
  indicator: HTMLElement,
  getPos: () => number
) {
  return function handleResizeStart(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    let isDragging = true;
    const startX = e.clientX;
    const startWidth = container.offsetWidth;

    indicator.style.opacity = "1";
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const newWidth = Math.max(100, Math.min(800, startWidth + deltaX));
      container.style.width = `${newWidth}px`;
    };

    const handleMouseUp = () => {
      if (!isDragging) return;

      isDragging = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      indicator.style.opacity = "0.6";

      // 保存新的宽度
      const finalWidth = container.offsetWidth;
      const pos = getPos();
      const command = setImageWidth(pos, finalWidth);
      command(view.state, view.dispatch);

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };
}

// 主函数：组装图片预览组件
export function imagePreview(
  app: App,
  view: EditorView,
  node: ProseMirrorNode,
  getPos: () => number
): HTMLElement {
  const { path, filename, type, extraInfo } = node.attrs;
  const { width } = JSON.parse(extraInfo || "{}");

  // 创建容器
  const container = h("div", {
    className: "file-preview",
    style: `
      display: inline-block;
      margin: 8px 0 0 0;
      border-radius: 8px;
      border: 1px solid var(--border-color-muted);
      background: var(--color-bg-muted);
      position: relative;
      ${width ? `width: ${width}px;` : "max-width: 100%;"}
    `,
  });

  // 创建各个组件
  const img = imageElement();
  const indicator = resizeHandleIndicator();

  // 按钮事件处理函数
  const handleDelete = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // TODO: 实现删除逻辑
  };

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
            type: "item",
            icon: ArrowRightIcon,
            label: "转为引用",
            action: () => {
              const pos = getPos();
              const command = changeFileDisplayMode(pos, "inline");
              command(view.state, view.dispatch);
            },
          } as const,
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
          { type: "divider" } as const,
          {
            type: "item",
            icon: DownloadIcon,
            label: "下载图片",
            action: () => {
              // 下载图片
              const url = imageUrlCache.get(path);
              if (url) {
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                a.click();
              }
            },
          } as const,
          {
            type: "item",
            icon: InfoIcon,
            label: "详细信息",
            action: () => {},
          } as const,
        ];

        contextMenu.show(e.clientX, e.clientY, menuItems);
      });
    });
  };

  const actions = actionButtons(handleDelete, handleMore);
  const resizeStart = resizeHandler(
    app,
    view,
    path,
    container,
    indicator,
    getPos
  );
  const handle = createResizeHandler(indicator, resizeStart);

  // 设置功能
  setupImageLoader(app, img, container, path, filename, type);
  setupContainerEvents(container, indicator, actions);

  // 组装组件
  container.appendChild(img);
  container.appendChild(actions);
  container.appendChild(handle);

  return container;
}
