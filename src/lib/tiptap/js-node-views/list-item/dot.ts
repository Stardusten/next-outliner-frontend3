export function getDotDiv(className?: string) {
  const svg = `<svg viewBox="0 0 15 15" xmlns="http://www.w3.org/2000/svg"${className ? ` class="${className}"` : ""}>
      <circle cx="7.5" cy="7.5" r="2.5" fill="currentColor" />
    </svg>`;
  const span = document.createElement("span");
  span.innerHTML = svg;
  return span.firstChild as SVGElement;
}
