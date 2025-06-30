export function h(
  tag: string,
  props: {
    className?: string;
    style?: string;
    innerHTML?: string;
    textContent?: string;
    listeners?: {
      [K in keyof HTMLElementEventMap]?: (
        this: HTMLElement,
        ev: HTMLElementEventMap[K]
      ) => void;
    };
    draggable?: boolean;
  } = {},
  ...children: HTMLElement[]
): HTMLElement {
  const element = document.createElement(tag);

  if (props.className) element.className = props.className;
  if (props.style) element.style.cssText = props.style;
  if (props.innerHTML) element.innerHTML = props.innerHTML;
  if (props.textContent) element.textContent = props.textContent;
  if (props.draggable) element.draggable = props.draggable;

  if (props.listeners) {
    Object.entries(props.listeners).forEach(([event, handler]) => {
      element.addEventListener(event, handler as EventListener);
    });
  }

  children.forEach((child) => element.appendChild(child));

  return element;
}
