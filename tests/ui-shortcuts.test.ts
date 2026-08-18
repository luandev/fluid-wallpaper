import { describe, expect, it } from "vitest";
import { shortcutFromKey } from "../src/ui/shortcuts";

describe("shortcuts", () => {
  it("maps H P F Esc", () => {
    expect(shortcutFromKey({ code: "KeyH" }, null)).toBe("toggleDash");
    expect(shortcutFromKey({ code: "KeyP" }, null)).toBe("togglePerf");
    expect(shortcutFromKey({ code: "KeyF" }, null)).toBe("toggleFullscreen");
    expect(shortcutFromKey({ code: "Escape", key: "Escape" }, null)).toBe("exitFullscreen");
  });

  it("ignores typing targets and repeats", () => {
    expect(shortcutFromKey({ code: "KeyH" }, { tagName: "INPUT" })).toBe("ignore");
    expect(shortcutFromKey({ code: "KeyP" }, { tagName: "TEXTAREA" })).toBe("ignore");
    expect(shortcutFromKey({ code: "KeyF", repeat: true }, null)).toBe("ignore");
    expect(shortcutFromKey({ code: "KeyA" }, null)).toBe("ignore");
  });
});
