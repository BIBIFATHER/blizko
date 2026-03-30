export const scrollToNext = (el: HTMLElement) => {
  const container = el.closest("form") || document.body;
  const focusables = Array.from(
    container.querySelectorAll<HTMLElement>(
      '[data-auto-advance-target="true"], input, textarea, select, button'
    )
  ).filter((node) => !node.hasAttribute("disabled"));

  const idx = focusables.indexOf(el);
  const target = idx >= 0 ? focusables[idx + 1] : null;

  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }
};
