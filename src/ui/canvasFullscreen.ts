export function toggleCanvasFullscreen(element: HTMLElement): void {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
    return;
  }
  const parent = element.parentElement;
  const target = parent?.querySelector(":scope > .yt-background") ? parent : element;
  void target.requestFullscreen();
}

export function exitCanvasFullscreen(): void {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
  }
}
