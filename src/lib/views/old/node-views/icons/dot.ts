export function iconDot(className?: string) {
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
