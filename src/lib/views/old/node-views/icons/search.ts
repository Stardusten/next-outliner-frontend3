export function iconSearch(className?: string[]) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 15 15");

  // 放大镜圆圈
  const circle = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "circle"
  );
  circle.setAttribute("cx", "6");
  circle.setAttribute("cy", "6");
  circle.setAttribute("r", "3.5");
  circle.setAttribute("fill", "none");
  circle.setAttribute("stroke", "currentColor");
  circle.setAttribute("stroke-width", "1.5");

  // 放大镜手柄
  const handle = document.createElementNS("http://www.w3.org/2000/svg", "line");
  handle.setAttribute("x1", "8.5");
  handle.setAttribute("y1", "8.5");
  handle.setAttribute("x2", "12");
  handle.setAttribute("y2", "12");
  handle.setAttribute("stroke", "currentColor");
  handle.setAttribute("stroke-width", "1.5");
  handle.setAttribute("stroke-linecap", "round");

  svg.appendChild(circle);
  svg.appendChild(handle);

  for (const cn of className ?? []) {
    svg.classList.add(cn);
  }

  return svg;
}
