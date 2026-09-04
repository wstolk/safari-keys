export function isEscape(event) {
  return event.key === "Escape" || (event.ctrlKey && event.key === "[");
}
