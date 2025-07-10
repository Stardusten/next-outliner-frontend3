import type { BlockId } from "@/lib/common/types";
import type { EditorView, NodeView } from "prosemirror-view";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import { outlinerSchema } from "../schema";
import type { Observable } from "@/lib/common/observable";
import type { App } from "@/lib/app/app";
import { getInRefs } from "@/lib/app/index/in-refs";

export function createListItemNodeViewClass(app: App) {
  return class implements NodeView {
    dom: HTMLElement;
    contentDOM: HTMLElement;
    refCounterUnsub: (() => void) | null = null;
    inRefs: Observable<Set<BlockId>>;

    constructor(
      node: ProseMirrorNode,
      view: EditorView,
      getPos: () => number | undefined
    ) {
      if (node.type !== outlinerSchema.nodes.listItem) {
        throw new Error("impossible. list item nodeview get a node" + node);
      }

      const el = document.createElement("div");
      el.classList.add("list-item");
      el.dataset.level = node.attrs.level;
      el.dataset.blockId = node.attrs.blockId;
      el.dataset.folded = String(node.attrs.folded);
      el.dataset.hasChildren = String(node.attrs.hasChildren);
      el.dataset.type = node.attrs.type;
      el.dataset.thinking = String(node.attrs.thinking);
      el.style.setProperty("--level", node.attrs.level);

      const left = document.createElement("div");
      left.classList.add("list-item-left");
      left.appendChild(getTriangleDiv("fold-btn"));

      // 根据 thinking 属性决定显示普通 bullet 还是旋转 loader
      if (node.attrs.thinking) {
        left.appendChild(getThinkingLoaderDiv("bullet", "thinking-loader"));
      } else {
        left.appendChild(getDotDiv("bullet"));
      }

      const content = document.createElement("div");
      content.classList.add("list-item-content");

      const refCounter = document.createElement("div");
      refCounter.classList.add("ref-counter");
      this.inRefs = getInRefs(app, node.attrs.blockId);

      this.refCounterUnsub = this.inRefs.subscribe(
        (refs) => {
          const nref = refs.size;
          refCounter.dataset.nref = nref.toString();
          refCounter.innerText = nref.toString();

          if (nref > 0) {
            el.classList.add("has-in-refs");
          }
        },
        { immediate: true }
      );

      el.appendChild(left);
      el.appendChild(content);
      el.appendChild(refCounter);

      this.dom = el;
      this.contentDOM = content;
    }

    destroy() {
      if (this.refCounterUnsub) {
        this.refCounterUnsub();
      }
      this.dom.remove();
    }
  };
}

function getTriangleDiv(className?: string) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 15 15");

  const triangle = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polygon"
  );
  triangle.setAttribute("points", "5,5 10,5 7.5,10");
  triangle.setAttribute("fill", "currentColor");

  svg.appendChild(triangle);

  if (className) {
    svg.classList.add(className);
  }

  return svg;
}

function getDotDiv(className?: string) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 15 15");

  const circle = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "circle"
  );
  circle.setAttribute("cx", "7.5");
  circle.setAttribute("cy", "7.5");
  circle.setAttribute("r", "2.5");
  circle.setAttribute("fill", "currentColor");

  svg.appendChild(circle);

  if (className) {
    svg.classList.add(className);
  }

  return svg;
}

function getThinkingLoaderDiv(className?: string, loaderClassName?: string) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 15 15");

  const circle = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "circle"
  );
  circle.setAttribute("cx", "7.5");
  circle.setAttribute("cy", "7.5");
  circle.setAttribute("r", "2.5");
  circle.setAttribute("fill", "var(--color-muted-foreground)");

  // 外围的加载圆环（有缺口的圆环）
  const loader = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "circle"
  );
  loader.setAttribute("cx", "7.5");
  loader.setAttribute("cy", "7.5");
  loader.setAttribute("r", "6.5");
  loader.setAttribute("fill", "none");
  loader.setAttribute("stroke", "var(--color-primary)");
  loader.setAttribute("stroke-width", "1.5");
  loader.setAttribute("stroke-linecap", "round");

  // 设置圆环的周长，留出缺口
  const circumference = 2 * Math.PI * 6; // 2π * r
  const dashLength = circumference * 0.75; // 圆环占75%
  const gapLength = circumference * 0.25; // 缺口占25%
  loader.setAttribute("stroke-dasharray", `${dashLength} ${gapLength}`);
  loader.setAttribute("stroke-dashoffset", "0");

  svg.appendChild(circle);
  svg.appendChild(loader);

  if (className) {
    svg.classList.add(className);
  }

  if (loaderClassName) {
    svg.classList.add(loaderClassName);
  }

  return svg;
}
