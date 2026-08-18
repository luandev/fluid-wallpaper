export function toggleCanvasFullscreen(element: HTMLElement): void {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
    return;
  }
  void element.requestFullscreen();
}

export function exitCanvasFullscreen(): void {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
  }
}
