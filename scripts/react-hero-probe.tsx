import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { FluidHero } from "../package-dist/react.js";
import type { FluidHeroElement } from "../package-dist/hero.js";
export async function runReactProbe() {
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;inset:0;width:160px;height:120px";
  document.body.append(host);
  const root = createRoot(host);
  const config = {
    warmupSteps: 0,
    simResolution: 128,
    dyeResolution: 128,
    backgroundMode: "transparent" as const,
  };
  const check = (ok: unknown, message: string) => {
    if (!ok) throw Error(message);
  };
  try {
    flushSync(() =>
      root.render(
        <StrictMode>
          <FluidHero paused config={config}>
            <h2>React content</h2>
          </FluidHero>
        </StrictMode>,
      ),
    );
    const hero = host.querySelector("fluid-hero") as FluidHeroElement;
    check(
      hero.config.backgroundMode === "transparent",
      "React property config",
    );
    check(
      !hero.shadowRoot?.querySelector("fluid-ink"),
      "Paused React hero avoids GPU allocation",
    );
    flushSync(() =>
      root.render(
        <StrictMode>
          <FluidHero paused config={{ ...config, contrast: 2.2 }}>
            <h2>Updated</h2>
          </FluidHero>
        </StrictMode>,
      ),
    );
    check(
      hero.config.contrast === 2.2 && hero.textContent === "Updated",
      "React live props and children",
    );
    flushSync(() =>
      root.render(
        <StrictMode>
          <FluidHero paused={false} config={config}>
            <h2>Playing</h2>
          </FluidHero>
        </StrictMode>,
      ),
    );
    check(!hero.hasAttribute("paused"), "React pause prop update");
    await new Promise((resolve) => setTimeout(resolve, 100));
    flushSync(() => root.unmount());
    check(
      !hero.shadowRoot?.querySelector("fluid-ink"),
      "React unmount cleanup",
    );
    return true;
  } finally {
    host.remove();
  }
}
