import { createRoot } from "react-dom/client";
import { useState, type ReactNode } from "react";
import { FluidField } from "./FluidField";
import "./embed.css";

type Mode = "field" | "dashboard";

function EmbedApp(): ReactNode {
  const [mode, setMode] = useState<Mode>("field");
  return (
    <div className="embed">
      <nav className="embed__nav">
        <span className="embed__mark">FW</span>
        <a href="./">Landing</a>
        <a href="./play.html">Tuner</a>
        <button type="button" data-active={mode === "field" ? "true" : "false"} onClick={() => setMode("field")}>
          React field
        </button>
        <button
          type="button"
          data-active={mode === "dashboard" ? "true" : "false"}
          onClick={() => setMode("dashboard")}
        >
          React + dashboard
        </button>
        <a href="https://github.com/luandev/fluid-wallpaper">GitHub</a>
      </nav>
      <FluidField key={mode} dashboard={mode === "dashboard"} persist={false} />
    </div>
  );
}

const root = document.querySelector("#root");
if (!(root instanceof HTMLElement)) {
  throw new Error("Missing #root");
}
createRoot(root).render(<EmbedApp />);
