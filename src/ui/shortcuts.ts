export type ShortcutKind =
  | "toggleDash"
  | "togglePerf"
  | "toggleFullscreen"
  | "exitFullscreen"
  | "ignore";

export type TypingLike = {
  tagName?: string;
  isContentEditable?: boolean;
};

export type ShortcutEvent = {
  code: string;
  key?: string;
  repeat?: boolean;
};

export function isTypingTarget(target: EventTarget | TypingLike | null): boolean {
  if (!target || typeof target !== "object") {
    return false;
  }
  const tag =
    "tagName" in target && typeof target.tagName === "string" ? target.tagName.toUpperCase() : "";
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") {
    return true;
  }
  return Boolean("isContentEditable" in target && target.isContentEditable);
}

export function shortcutFromKey(
  event: ShortcutEvent,
  target: EventTarget | TypingLike | null,
): ShortcutKind {
  if (event.repeat) {
    return "ignore";
  }
  if (isTypingTarget(target)) {
    return "ignore";
  }
  if (event.code === "KeyH") {
    return "toggleDash";
  }
  if (event.code === "KeyP") {
    return "togglePerf";
  }
  if (event.code === "KeyF") {
    return "toggleFullscreen";
  }
  if (event.code === "Escape" || event.key === "Escape") {
    return "exitFullscreen";
  }
  return "ignore";
}
