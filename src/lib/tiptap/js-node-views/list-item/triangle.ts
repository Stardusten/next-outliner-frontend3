export function getTriangleDiv(className?: string) {
  const svg = `<svg viewBox="0 0 15 15" xmlns="http://www.w3.org/2000/svg"${className ? ` class="${className}"` : ""}>
      <polygon points="5,5 10,5 7.5,10" fill="currentColor" />
    </svg>`;
  const span = document.createElement("span");
  span.innerHTML = svg;
  return span.firstChild as SVGElement;
}
