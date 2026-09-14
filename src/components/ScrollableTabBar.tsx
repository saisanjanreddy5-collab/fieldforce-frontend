import { useDraggableScroll } from "../hooks/use-draggable-scroll";
import { ScrollTrack } from "./ScrollTrack";

export interface ScrollableTabItem {
  key: string;
  label: string;
}

interface ScrollableTabBarProps {
  items: ScrollableTabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

// A drop-in replacement for antd's <Tabs> nav row - antd's own overflow
// handling is just a "..." dropdown with no way to drag/swipe through the
// tabs, so this reuses the same draggable scrollbar built for the Leads
// filter bar instead. Tab *content* switching is left to the caller (render
// whichever pane matches `activeKey`), this only owns the tab strip itself.
export function ScrollableTabBar({ items, activeKey, onChange }: ScrollableTabBarProps) {
  const scroll = useDraggableScroll([items.length]);

  return (
    <div>
      <div
        ref={scroll.scrollRef}
        className="scrollbar-hidden"
        style={{ display: "flex", gap: 24, overflowX: "auto", borderBottom: "1px solid #f0f0f0" }}
      >
        {items.map((item) => {
          const selected = item.key === activeKey;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              style={{
                flexShrink: 0,
                padding: "10px 2px",
                fontSize: 14,
                fontWeight: selected ? 500 : 400,
                border: "none",
                borderBottom: selected ? "2px solid #1677ff" : "2px solid transparent",
                background: "transparent",
                color: selected ? "#1677ff" : "rgba(0,0,0,0.65)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <ScrollTrack
        track={scroll.track}
        dragging={scroll.dragging}
        trackRef={scroll.trackRef}
        onTrackClick={scroll.handleTrackClick}
        onThumbPointerDown={scroll.handleThumbPointerDown}
        onThumbPointerMove={scroll.handleThumbPointerMove}
        onThumbPointerUp={scroll.handleThumbPointerUp}
      />
    </div>
  );
}
