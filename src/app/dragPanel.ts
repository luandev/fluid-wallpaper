import {
  PANEL_SIZE_FALLBACK,
  clampPanelPos,
  loadPanelLayout,
  measurePanel,
  savePanelPos,
  viewportSize,
  type PanelId,
} from "./panelLayout";

const DRAG_THRESHOLD = 4;

function writePos(element: HTMLElement, left: number, top: number): void {
  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
  element.style.right = "auto";
  element.style.bottom = "auto";
}

export function restorePanelPosition(element: HTMLElement, id: PanelId): void {
  const stored = loadPanelLayout()[id];
  if (!stored) {
    return;
  }
  const pos = clampPanelPos(
    stored.left,
    stored.top,
    measurePanel(element, PANEL_SIZE_FALLBACK[id]),
    viewportSize(),
  );
  writePos(element, pos.left, pos.top);
}

export function attachDraggablePanel(options: {
  element: HTMLElement;
  handle: HTMLElement;
  id: PanelId;
}): () => void {
  const { element, handle, id } = options;
  restorePanelPosition(element, id);

  let pointerId: number | undefined;
  let originX = 0;
  let originY = 0;
  let startLeft = 0;
  let startTop = 0;
  let dragging = false;
  let moved = false;

  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) {
      return;
    }
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      target !== handle &&
      (target.tagName === "INPUT" ||
        target.tagName === "SELECT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "BUTTON" ||
        target.isContentEditable)
    ) {
      return;
    }
    const rect = element.getBoundingClientRect();
    pointerId = event.pointerId;
    originX = event.clientX;
    originY = event.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    dragging = true;
    moved = false;
    handle.setPointerCapture(event.pointerId);
    element.dataset.dragging = "true";
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (!dragging || event.pointerId !== pointerId) {
      return;
    }
    const dx = event.clientX - originX;
    const dy = event.clientY - originY;
    if (!moved && dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) {
      return;
    }
    moved = true;
    event.preventDefault();
    const pos = clampPanelPos(
      startLeft + dx,
      startTop + dy,
      measurePanel(element, PANEL_SIZE_FALLBACK[id]),
      viewportSize(),
    );
    writePos(element, pos.left, pos.top);
  };

  const finish = (event: PointerEvent): void => {
    if (!dragging || event.pointerId !== pointerId) {
      return;
    }
    dragging = false;
    pointerId = undefined;
    element.dataset.dragging = "false";
    if (moved) {
      const rect = element.getBoundingClientRect();
      const pos = clampPanelPos(rect.left, rect.top, measurePanel(element, PANEL_SIZE_FALLBACK[id]), viewportSize());
      writePos(element, pos.left, pos.top);
      savePanelPos(id, pos);
    }
  };

  const onClickCapture = (event: MouseEvent): void => {
    if (!moved) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    moved = false;
  };

  const onResize = (): void => {
    restorePanelPosition(element, id);
  };

  handle.addEventListener("pointerdown", onPointerDown);
  handle.addEventListener("pointermove", onPointerMove);
  handle.addEventListener("pointerup", finish);
  handle.addEventListener("pointercancel", finish);
  handle.addEventListener("click", onClickCapture, true);
  window.addEventListener("resize", onResize);

  return () => {
    handle.removeEventListener("pointerdown", onPointerDown);
    handle.removeEventListener("pointermove", onPointerMove);
    handle.removeEventListener("pointerup", finish);
    handle.removeEventListener("pointercancel", finish);
    handle.removeEventListener("click", onClickCapture, true);
    window.removeEventListener("resize", onResize);
  };
}
