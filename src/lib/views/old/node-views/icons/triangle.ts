export function iconTriangle(className?: string) {
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
