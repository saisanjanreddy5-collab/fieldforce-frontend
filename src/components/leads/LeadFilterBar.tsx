import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from "react";
import { Button } from "antd";
import { FilterOutlined } from "@ant-design/icons";

export interface FilterTabDef {
  key: string;
  label: string;
  count: number;
  dotColor?: string;
}

interface LeadFilterBarProps {
  tabs: FilterTabDef[];
  activeTab: string;
  onTabChange: (key: string) => void;
  totalCount: number;
  shownCount: number;
  filtersOpen: boolean;
  onToggleFilters: () => void;
}

// Spans the FULL page width (above both the list and detail columns) -
// not confined to the narrow list sidebar, which is what made this cramped
// before.
export function LeadFilterBar({
  tabs,
  activeTab,
  onTabChange,
  totalCount,
  shownCount,
  filtersOpen,
  onToggleFilters,
}: LeadFilterBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startScrollLeft: number } | null>(null);
  const [track, setTrack] = useState<{ thumbPercent: number; leftPercent: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  // A real native scrollbar only appears on hover/scroll in most browsers,
  // so it can't be relied on as a permanent "there's more to see" hint. This
  // draws an always-visible track/thumb instead, driven by the actual scroll
  // position - not just decorative, it reflects real overflow and is itself
  // draggable/clickable like a real scrollbar (see handlers below).
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
  }, [tabs]);

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

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", rowGap: 8 }}>
        <div ref={scrollRef} className="scrollbar-hidden" style={{ display: "flex", gap: 8, overflowX: "auto", flex: 1, minWidth: 160 }}>
          {tabs.map((tab) => {
            const selected = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                style={{
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  fontSize: 13,
                  lineHeight: "20px",
                  borderRadius: 999,
                  border: selected ? "1px solid #1677ff" : "1px solid #d9d9d9",
                  background: selected ? "#1677ff" : "#fff",
                  color: selected ? "#fff" : "rgba(0,0,0,0.88)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.dotColor && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: selected ? "#fff" : tab.dotColor,
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                )}
                {tab.label} {tab.count}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: "#898781", whiteSpace: "nowrap" }}>
            {shownCount} of {totalCount} leads shown
          </span>
          <Button size="small" icon={<FilterOutlined />} type={filtersOpen ? "primary" : "default"} onClick={onToggleFilters}>
            Filters
          </Button>
        </div>
      </div>
      {track && (
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          style={{ marginTop: 6, height: 6, background: "#f0f0f0", borderRadius: 999, position: "relative", cursor: "pointer" }}
        >
          <div
            onPointerDown={handleThumbPointerDown}
            onPointerMove={handleThumbPointerMove}
            onPointerUp={handleThumbPointerUp}
            style={{
              position: "absolute",
              top: 0,
              left: `${track.leftPercent}%`,
              width: `${track.thumbPercent}%`,
              height: "100%",
              background: dragging ? "#8c8c8c" : "#bfbfbf",
              borderRadius: 999,
              cursor: dragging ? "grabbing" : "grab",
              touchAction: "none",
            }}
          />
        </div>
      )}
    </div>
  );
}
