import type { RefObject } from "react";
import type { DraggableScrollTrack } from "../hooks/use-draggable-scroll";

interface ScrollTrackProps {
  track: DraggableScrollTrack | null;
  dragging: boolean;
  trackRef: RefObject<HTMLDivElement | null>;
  onTrackClick: React.MouseEventHandler<HTMLDivElement>;
  onThumbPointerDown: React.PointerEventHandler<HTMLDivElement>;
  onThumbPointerMove: React.PointerEventHandler<HTMLDivElement>;
  onThumbPointerUp: React.PointerEventHandler<HTMLDivElement>;
}

// The visual half of useDraggableScroll - a thin track with a draggable
// thumb, sized/positioned from the hook's measured scroll state.
export function ScrollTrack({
  track,
  dragging,
  trackRef,
  onTrackClick,
  onThumbPointerDown,
  onThumbPointerMove,
  onThumbPointerUp,
}: ScrollTrackProps) {
  if (!track) return null;

  return (
    <div
      ref={trackRef}
      onClick={onTrackClick}
      style={{ marginTop: 6, height: 6, background: "#f0f0f0", borderRadius: 999, position: "relative", cursor: "pointer" }}
    >
      <div
        onPointerDown={onThumbPointerDown}
        onPointerMove={onThumbPointerMove}
        onPointerUp={onThumbPointerUp}
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
  );
}
