import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from "react";

export interface DraggableScrollTrack {
  thumbPercent: number;
  leftPercent: number;
}

// A real native scrollbar only appears on hover/scroll in most browsers, so
// it can't be relied on as a permanent "there's more to see" hint. This
// tracks a horizontally-scrollable element and exposes an always-visible
// track/thumb driven by the actual scroll position - draggable and
// clickable like a real scrollbar, not just decorative.
//
// `deps` re-measures the track when the scrollable content itself changes
// shape (e.g. a dynamic list of tabs) - pass `[]` when the content is fixed.
export function useDraggableScroll(deps: unknown[]) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startScrollLeft: number } | null>(null);
  const [track, setTrack] = useState<DraggableScrollTrack | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      const { scrollWidth, clientWidth, scrollLeft } = el;
      if (scrollWidth <= clientWidth) {
        setTrack(null);
        return;
      }
      const thumbPercent = (clientWidth / scrollWidth) * 100;
      const leftPercent = (scrollLeft / scrollWidth) * 100;
      setTrack({ thumbPercent, leftPercent });
    };

    update();
    el.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const handleThumbPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { startX: e.clientX, startScrollLeft: el.scrollLeft };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleThumbPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    const trackEl = trackRef.current;
    if (!el || !trackEl || !dragRef.current) return;
    const deltaX = e.clientX - dragRef.current.startX;
    const scrollDelta = (deltaX / trackEl.clientWidth) * el.scrollWidth;
    el.scrollLeft = dragRef.current.startScrollLeft + scrollDelta;
  };

  const handleThumbPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    setDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  // Clicking directly on the track (not the thumb) jumps the scroll to that
  // position, matching how a native scrollbar track behaves.
  const handleTrackClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    const trackEl = trackRef.current;
    if (!el || !trackEl) return;
    const rect = trackEl.getBoundingClientRect();
    const clickPercent = (e.clientX - rect.left) / rect.width;
    el.scrollLeft = clickPercent * el.scrollWidth - el.clientWidth / 2;
  };

  return {
    scrollRef,
    trackRef,
    track,
    dragging,
    handleThumbPointerDown,
    handleThumbPointerMove,
    handleThumbPointerUp,
    handleTrackClick,
  };
}
