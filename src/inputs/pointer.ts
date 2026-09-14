export type PointerSplat = {
  uv: [number, number];
  delta: [number, number];
};

export class PointerInput {
  private down = false;
  private x = 0;
  private y = 0;
  private prevX = 0;
  private prevY = 0;
  private pendingDeltaX = 0;
  private pendingDeltaY = 0;
  private enabled = true;
  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.addEventListener("pointerdown", this.onDown);
    canvas.addEventListener("pointermove", this.onMove);
    canvas.addEventListener("pointerup", this.onUp);
    canvas.addEventListener("pointercancel", this.onUp);
    canvas.addEventListener("pointerleave", this.onUp);
  }

  consume(): PointerSplat | null {
    if (
      !this.enabled ||
      Math.abs(this.pendingDeltaX) + Math.abs(this.pendingDeltaY) <= 1e-6
    ) {
      this.pendingDeltaX = 0;
      this.pendingDeltaY = 0;
      return null;
    }
    const deltaX = this.pendingDeltaX;
    const deltaY = this.pendingDeltaY;
    this.pendingDeltaX = 0;
    this.pendingDeltaY = 0;
    return {
      uv: [this.x, this.y],
      delta: [deltaX, deltaY],
    };
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.down = false;
      this.pendingDeltaX = 0;
      this.pendingDeltaY = 0;
    }
  }

  dispose(): void {
    this.canvas.removeEventListener("pointerdown", this.onDown);
    this.canvas.removeEventListener("pointermove", this.onMove);
    this.canvas.removeEventListener("pointerup", this.onUp);
    this.canvas.removeEventListener("pointercancel", this.onUp);
    this.canvas.removeEventListener("pointerleave", this.onUp);
  }

  private eventUv(event: PointerEvent): [number, number] {
    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / Math.max(rect.width, 1);
    const y = 1 - (event.clientY - rect.top) / Math.max(rect.height, 1);
    return [x, y];
  }

  private readonly onDown = (event: PointerEvent): void => {
    if (!this.enabled) {
      return;
    }
    this.canvas.setPointerCapture(event.pointerId);
    const [x, y] = this.eventUv(event);
    this.down = true;
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.pendingDeltaX = 0;
    this.pendingDeltaY = 0;
  };

  private readonly onMove = (event: PointerEvent): void => {
    if (!this.enabled) {
      return;
    }
    const [x, y] = this.eventUv(event);
    if (!this.down) {
      this.x = x;
      this.y = y;
      return;
    }
    this.prevX = this.x;
    this.prevY = this.y;
    this.x = x;
    this.y = y;
    if (Math.abs(x - this.prevX) + Math.abs(y - this.prevY) > 1e-6) {
      this.pendingDeltaX += x - this.prevX;
      this.pendingDeltaY += y - this.prevY;
    }
  };

  private readonly onUp = (event: PointerEvent): void => {
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
    this.down = false;
  };
}
