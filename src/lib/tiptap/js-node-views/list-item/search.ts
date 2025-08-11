export function getSearchDiv(className?: string) {
  const span = document.createElement("span");
  const svgClass =
    "lucide lucide-search lucide-search" + (className ? " " + className : "");
  span.innerHTML = `<svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="${svgClass}"
    >
      <path d="m21 21-6-6"/>
      <circle cx="11" cy="11" r="7"/>
    </svg>`;
  return span.firstChild as SVGElement;
}
