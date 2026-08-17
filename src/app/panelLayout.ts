export const PANEL_LAYOUT_KEY = "fluid-wallpaper.panels.v1";

export const PANEL_IDS = ["dash", "perf", "dashFab", "perfFab"] as const;
export type PanelId = (typeof PANEL_IDS)[number];

export type PanelPos = {
  left: number;
  top: number;
};

export type PanelSize = {
  width: number;
  height: number;
};

export type ViewportSize = {
  width: number;
  height: number;
};

export type PanelLayout = Partial<Record<PanelId, PanelPos>>;

export const PANEL_SIZE_FALLBACK: Record<PanelId, PanelSize> = {
  dash: { width: 420, height: 480 },
  perf: { width: 160, height: 108 },
  dashFab: { width: 68, height: 36 },
  perfFab: { width: 52, height: 36 },
};

function isPanelId(value: string): value is PanelId {
  return (PANEL_IDS as readonly string[]).includes(value);
}

export function sanitizePanelPos(raw: unknown): PanelPos | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const input = raw as Record<string, unknown>;
  if (typeof input.left !== "number" || typeof input.top !== "number") {
    return undefined;
  }
  if (!Number.isFinite(input.left) || !Number.isFinite(input.top)) {
    return undefined;
  }
  return {
    left: Math.round(input.left),
    top: Math.round(input.top),
  };
}

export function sanitizePanelLayout(raw: unknown): PanelLayout {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const input = raw as Record<string, unknown>;
  const out: PanelLayout = {};
  for (const key of Object.keys(input)) {
    if (!isPanelId(key)) {
      continue;
    }
    const pos = sanitizePanelPos(input[key]);
    if (pos) {
      out[key] = pos;
    }
  }
  return out;
}

export function clampPanelPos(
  left: number,
  top: number,
  size: PanelSize,
  viewport: ViewportSize,
  margin = 8,
): PanelPos {
  const maxLeft = viewport.width - size.width - margin;
  const maxTop = viewport.height - size.height - margin;
  const loLeft = Math.min(margin, maxLeft);
  const hiLeft = Math.max(margin, maxLeft);
  const loTop = Math.min(margin, maxTop);
  const hiTop = Math.max(margin, maxTop);
  return {
    left: Math.round(Math.min(hiLeft, Math.max(loLeft, left))),
    top: Math.round(Math.min(hiTop, Math.max(loTop, top))),
  };
}

export function loadPanelLayout(): PanelLayout {
  try {
    const raw = localStorage.getItem(PANEL_LAYOUT_KEY);
    if (!raw) {
      return {};
    }
    return sanitizePanelLayout(JSON.parse(raw) as unknown);
  } catch {
    return {};
  }
}

export function savePanelPos(id: PanelId, pos: PanelPos): PanelLayout {
  const next = { ...loadPanelLayout(), [id]: { left: Math.round(pos.left), top: Math.round(pos.top) } };
  try {
    localStorage.setItem(PANEL_LAYOUT_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
  return next;
}

export function viewportSize(
  getWidth: () => number = () => window.innerWidth,
  getHeight: () => number = () => window.innerHeight,
): ViewportSize {
  return {
    width: Math.max(1, getWidth()),
    height: Math.max(1, getHeight()),
  };
}

export function measurePanel(element: HTMLElement, fallback: PanelSize): PanelSize {
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  return {
    width: width >= 2 ? width : fallback.width,
    height: height >= 2 ? height : fallback.height,
  };
}
