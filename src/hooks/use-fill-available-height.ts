import { useLayoutEffect, useState, type RefObject } from "react";

function scrollParentOf(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
  }
  return null;
}

// Height that makes `ref`'s element reach exactly the bottom of its scrolling
// pane (or the window), measured from where it sits with that pane scrolled
// to the top - so a panel like a chat fits on screen under whatever sits above
// it and scrolls inside itself, instead of making the whole pane scroll.
// Never below `minHeight`: on a very short screen the pane scrolls as usual.
export function useFillAvailableHeight(ref: RefObject<HTMLElement | null>, minHeight: number): number {
  const [height, setHeight] = useState(minHeight);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pane = scrollParentOf(el);

    const measure = () => {
      const top = el.getBoundingClientRect().top + (pane?.scrollTop ?? 0);
      let bottom = window.innerHeight;
      if (pane) {
        const rect = pane.getBoundingClientRect();
        bottom = Math.min(rect.bottom, window.innerHeight) - parseFloat(getComputedStyle(pane).paddingBottom || "0");
      }
      const next = Math.max(minHeight, Math.floor(bottom - top));
      setHeight((prev) => (prev === next ? prev : next));
    };

    measure();
    // Re-fit when the window or pane resizes, or when content above it
    // changes height (lead actions loading, banners appearing).
    const observer = new ResizeObserver(measure);
    if (pane) {
      observer.observe(pane);
      if (pane.firstElementChild) observer.observe(pane.firstElementChild);
    }
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [ref, minHeight]);

  return height;
}
