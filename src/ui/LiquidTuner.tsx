import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { defineFluidInk, FluidInkElement, defaultLiquidScene, type LiquidScene, type LiquidStatus } from "../element";

defineFluidInk();
function LiquidTuner() {
  const host = useRef<HTMLDivElement>(null);
  const field = useRef<FluidInkElement | null>(null);
  const [scene, setScene] = useState(defaultLiquidScene);
  const [status, setStatus] = useState<LiquidStatus | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const element = document.createElement("fluid-ink") as FluidInkElement;
    element.style.height = "65vh";
    element.setAttribute("paused", "");
    element.scene = defaultLiquidScene();
    element.addEventListener("qualitychange", e => setStatus((e as CustomEvent<LiquidStatus>).detail));
    element.addEventListener("error", e => { if (e instanceof CustomEvent) setError((e.detail as { message: string }).message); });
    host.current?.append(element); field.current = element;
    return () => { element.remove(); field.current = null; };
  }, []);
  const edit = (change: (next: LiquidScene) => void) => {
    const next = structuredClone(scene); change(next);
    try { field.current?.updateScene(next); setScene(next); } catch (e) { setError(String(e)); }
  };
  const slider = (label: string, key: "surfaceTension" | "stirring" | "swirlScale" | "dose" | "absorption" | "relief" | "gloss", max: number, step: number) => <label key={key} style={{ display: "grid", gap: 4 }}>
    {label}: {scene[key]}<input type="range" min="0" max={max} step={step} value={scene[key]} onChange={e => edit(s => { s[key] = Number(e.target.value); })} />
  </label>;
  return <main>
    <div ref={host} />
    <section style={{ padding: "1rem", maxWidth: 1000, margin: "auto" }}>
      <h1>Two-liquid studio <small style={{ fontSize: ".55em" }}>experimental</small></h1>
      <p>Start with a quiet drop. Add pigment, then explore absorption and surface lighting. Press Play to run the experimental motion solver; its performance and physical convergence are under validation.</p>
      <p><a href="./play.html" style={{ color: "#9cf" }}>Legacy tuner</a> · <a href="./diagnostics.html" style={{ color: "#9cf" }}>Numerical diagnostics</a></p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={() => field.current?.play()}>Play</button><button onClick={() => field.current?.pause()}>Pause</button>
        <button onClick={() => field.current?.reset()}>New composition</button>
        {scene.pigments.map((p, i) => <button key={p.id} onClick={() => field.current?.inject({ position: { x: .25 + (i % 2) * .5, y: .25 + Math.floor(i / 2) * .5 }, pigmentSlot: i, fraction: .4, radius: .08 })}>Add {p.id}</button>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
        <label>Liquid viscosity: {scene.phases[0].viscosity}<input aria-label="Liquid viscosity" type="range" min=".0001" max=".01" step=".0001" value={scene.phases[0].viscosity} onChange={e => edit(s => { const ratio = s.phases[1].viscosity / s.phases[0].viscosity; s.phases[0].viscosity = Number(e.target.value); s.phases[1].viscosity = Math.min(.1, s.phases[0].viscosity * ratio); })} /></label>
        <label>Viscosity contrast: {(scene.phases[1].viscosity / scene.phases[0].viscosity).toFixed(1)}<input aria-label="Viscosity contrast" type="range" min="1" max="10" step=".1" value={scene.phases[1].viscosity / scene.phases[0].viscosity} onChange={e => edit(s => { s.phases[1].viscosity = s.phases[0].viscosity * Number(e.target.value); })} /></label>
        {slider("Surface tension", "surfaceTension", .001, .00001)}{slider("Stirring strength", "stirring", .02, .0001)}
        {slider("Swirl scale", "swirlScale", 8, .1)}{slider("Pigment dose", "dose", 3, .05)}
        {slider("Absorption", "absorption", 3, .05)}{slider("Surface relief (stylized)", "relief", 1, .01)}{slider("Gloss", "gloss", 1, .01)}
        <label>Quality policy <select value={scene.quality} onChange={e => edit(s => { s.quality = e.target.value as LiquidScene["quality"]; })}>{["auto", "eco", "balanced", "high"].map(q => <option key={q}>{q}</option>)}</select></label>
        <label><input type="checkbox" checked={scene.detail} onChange={e => edit(s => { s.detail = e.target.checked; })} /> Flow-carried surface detail (stylized)</label>
      </div>
      {error && <p role="alert">{error}</p>}
      <details><summary>Quality status</summary><pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(status, null, 2)}</pre></details>
    </section>
  </main>;
}
const root = document.getElementById("liquid-studio");
if (root) createRoot(root).render(<LiquidTuner />);
