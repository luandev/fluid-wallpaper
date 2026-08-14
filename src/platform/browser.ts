export type ViewportSize = {
  cssWidth: number;
  cssHeight: number;
  pixelWidth: number;
  pixelHeight: number;
  aspect: number;
};

export class BrowserPlatform {
  readonly canvas: HTMLCanvasElement;
  private readonly observer: ResizeObserver;
  private readonly onResize: () => void;
  private readonly onVisibility: (visible: boolean) => void;
  private disposed = false;

  constructor(
    canvas: HTMLCanvasElement,
    hooks: { onResize: () => void; onVisibility: (visible: boolean) => void },
  ) {
    this.canvas = canvas;
    this.onResize = hooks.onResize;
    this.onVisibility = hooks.onVisibility;
    this.observer = new ResizeObserver(() => this.onResize());
    this.observer.observe(canvas);
    document.addEventListener("visibilitychange", this.handleVisibility);
  }

  getSize(): ViewportSize {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssWidth = Math.max(1, rect.width);
    const cssHeight = Math.max(1, rect.height);
    const pixelWidth = Math.max(1, Math.floor(cssWidth * dpr));
    const pixelHeight = Math.max(1, Math.floor(cssHeight * dpr));
    return {
      cssWidth,
      cssHeight,
      pixelWidth,
      pixelHeight,
      aspect: cssWidth / cssHeight,
    };
  }

  applyCanvasResolution(size: ViewportSize): boolean {
    const changed =
      this.canvas.width !== size.pixelWidth || this.canvas.height !== size.pixelHeight;
    if (changed) {
      this.canvas.width = size.pixelWidth;
      this.canvas.height = size.pixelHeight;
    }
    return changed;
  }

  get visible(): boolean {
    return !document.hidden;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.observer.disconnect();
    document.removeEventListener("visibilitychange", this.handleVisibility);
  }

  private readonly handleVisibility = (): void => {
    this.onVisibility(this.visible);
  };
}
