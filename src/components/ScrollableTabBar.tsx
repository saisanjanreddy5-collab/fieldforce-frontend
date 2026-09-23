import { useDraggableScroll } from "../hooks/use-draggable-scroll";
import { appTokens } from "../utils/design-system";
import { ScrollTrack } from "./ScrollTrack";

export interface ScrollableTabItem {
  key: string;
  label: string;
  /** Shown as a small muted badge next to the label - e.g. "Preview" for
   * tabs backed by mock data, so a user scanning the tab row knows before
   * clicking that a section isn't live functionality. */
  badge?: string;
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
        style={{ display: "flex", gap: 26, overflowX: "auto", borderBottom: `1px solid ${appTokens.border}` }}
      >
        {items.map((item) => {
          const selected = item.key === activeKey;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              style={{
                flexShrink: 0,
                padding: "11px 2px",
                fontSize: 13.5,
                fontFamily: appTokens.font,
                fontWeight: selected ? 600 : 500,
                border: "none",
                borderBottom: selected ? `2px solid ${appTokens.primary}` : "2px solid transparent",
                background: "transparent",
                color: selected ? appTokens.primary : appTokens.textSecondary,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "color 0.12s, border-color 0.12s",
              }}
            >
              {item.label}
              {item.badge && (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 10,
                    fontWeight: 400,
                    color: "#ad6800",
                    background: "#fff7ec",
                    border: "1px solid #ffe7ba",
                    borderRadius: 999,
                    padding: "0 6px",
                  }}
                >
                  {item.badge}
                </span>
              )}
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
