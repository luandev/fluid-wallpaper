import { useEffect, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { clientToUv, radiusToPixels, uvToClient, type Uv, type ViewRect } from "./uv";

export type SpatialMark = {
  id: string;
  name: string;
  uvX: number;
  uvY: number;
  radius?: number;
  heading?: number;
};

export function SpatialOverlay({
  canvas,
  active,
  marks,
  selectedId,
  onSelect,
  onMove,
}: {
  canvas: HTMLCanvasElement | null;
  active: boolean;
  marks: readonly SpatialMark[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, uv: Uv) => void;
}): ReactNode {
  const [rect, setRect] = useState<ViewRect | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    if (!canvas || !active) {
      setRect(null);
      return;
    }
    const update = (): void => {
      const next = canvas.getBoundingClientRect();
      setRect({ left: next.left, top: next.top, width: next.width, height: next.height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(canvas);
    window.addEventListener("resize", update);
    document.addEventListener("fullscreenchange", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      document.removeEventListener("fullscreenchange", update);
    };
  }, [active, canvas]);

  if (!active || !rect || typeof document === "undefined") {
    return null;
  }

  const uvFromEvent = (event: ReactPointerEvent): Uv => clientToUv(event.clientX, event.clientY, rect);

  const onFieldDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (event.target !== event.currentTarget) {
      return;
    }
    const inMarks = selectedId && marks.some((mark) => mark.id === selectedId) ? selectedId : marks[0]?.id;
    const targetId = inMarks;
    if (!targetId) {
      return;
    }
    onSelect(targetId);
    onMove(targetId, uvFromEvent(event));
    setDragId(targetId);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onFieldMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!dragId) {
      return;
    }
    onMove(dragId, uvFromEvent(event));
  };

  return createPortal(
    <div
      className="spatial"
      data-active="true"
      onPointerDown={onFieldDown}
      onPointerMove={onFieldMove}
      onPointerUp={() => setDragId(null)}
      onPointerCancel={() => setDragId(null)}
    >
      {marks.map((mark) => {
        const pos = uvToClient({ u: mark.uvX, v: mark.uvY }, rect);
        const selected = mark.id === selectedId;
        const radiusPx = mark.radius !== undefined ? radiusToPixels(mark.radius, rect) : 0;
        const headingDeg = (mark.heading ?? 0) * 360;
        return (
          <div
            key={mark.id}
            className="spatial__stack"
            style={{ left: pos.x, top: pos.y }}
          >
            {radiusPx > 0 ? (
              <span className="spatial__ring" data-selected={selected ? "true" : "false"} style={{ width: radiusPx * 2, height: radiusPx * 2 }} />
            ) : null}
            {mark.heading !== undefined ? <span className="spatial__heading" style={{ transform: `rotate(${headingDeg}deg)` }} /> : null}
            <button
              type="button"
              className="spatial__mark"
              data-selected={selected ? "true" : "false"}
              title={mark.name}
              onPointerDown={(event) => {
                event.stopPropagation();
                onSelect(mark.id);
                setDragId(mark.id);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (dragId !== mark.id) {
                  return;
                }
                onMove(mark.id, uvFromEvent(event));
              }}
              onPointerUp={() => setDragId(null)}
            >
              {mark.name}
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
