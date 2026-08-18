import { createRoot, type Root } from "react-dom/client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cloneConfig, defaultConfig, type FluidConfig } from "../app/config";
import type { Engine } from "../app/engine";
import { saveStoredConfig } from "../app/storage";
import { attachDraggablePanel, restorePanelPosition } from "../app/dragPanel";
import { exitCanvasFullscreen, toggleCanvasFullscreen } from "./canvasFullscreen";
import { shortcutFromKey } from "./shortcuts";
import { SpatialOverlay } from "./spatial/SpatialOverlay";
import { DriversTab } from "./tabs/DriversTab";
import { EmittersTab } from "./tabs/EmittersTab";
import { MaterialsTab } from "./tabs/MaterialsTab";
import { PresetsTab } from "./tabs/PresetsTab";
import { SceneTab } from "./tabs/SceneTab";
import { WindTab } from "./tabs/WindTab";
import type { PatchFrom } from "./types";
import "./dashboard.css";

const TABS = ["Scene", "Materials", "Emitters", "Wind", "Drivers", "Presets"] as const;
type Tab = (typeof TABS)[number];

type DashboardProps = {
  engine: Engine;
  canvas?: HTMLCanvasElement | null;
  persist?: boolean;
};

export function Dashboard({ engine, canvas, persist = true }: DashboardProps): ReactNode {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<Tab>("Scene");
  const [config, setConfig] = useState<FluidConfig>(() => engine.getConfig());
  const [live, setLive] = useState<FluidConfig>(() => engine.getLiveConfig());
  const [elapsed, setElapsed] = useState(() => engine.getElapsed());
  const [selectedEmitterId, setSelectedEmitterId] = useState<string | null>(null);
  const [selectedWindId, setSelectedWindId] = useState<string | null>(null);
  const [selectedWaveId, setSelectedWaveId] = useState<string | null>(null);
  const [selectedBindingId, setSelectedBindingId] = useState<string | null>(null);
  const dashRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const view = resolveViewCanvas(canvas);

  useEffect(() => {
    if (!open) {
      return;
    }
    let raf = 0;
    const tick = (): void => {
      setLive(engine.getLiveConfig());
      setElapsed(engine.getElapsed());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine, open]);

  useEffect(() => {
    const dash = dashRef.current;
    const header = headerRef.current;
    if (!dash || !header) {
      return;
    }
    return attachDraggablePanel({ element: dash, handle: header, id: "dash" });
  }, []);

  useEffect(() => {
    const fab = fabRef.current;
    if (!fab) {
      return;
    }
    return attachDraggablePanel({ element: fab, handle: fab, id: "dashFab" });
  }, []);

  useEffect(() => {
    if (open && dashRef.current) {
      restorePanelPosition(dashRef.current, "dash");
    }
  }, [open]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const kind = shortcutFromKey(event, event.target);
      if (kind === "toggleDash") {
        setOpen((current) => !current);
        return;
      }
      if (kind === "toggleFullscreen") {
        if (view) {
          toggleCanvasFullscreen(view);
        }
        return;
      }
      if (kind === "exitFullscreen") {
        exitCanvasFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view]);

  const commit = useCallback(
    (patch: Partial<FluidConfig>, reseed = false): FluidConfig => {
      const next = engine.applyConfig(patch);
      if (persist) {
        saveStoredConfig(next);
      }
      if (reseed) {
        engine.reseed();
      }
      setConfig(next);
      return next;
    },
    [engine, persist],
  );

  const patchFrom: PatchFrom = useCallback(
    (builder, reseed = false) => commit(builder(engine.getConfig()), reseed),
    [commit, engine],
  );

  const pointMarks = useMemo(
    () =>
      config.emitters
        .filter((emitter) => emitter.kind === "point")
        .map((emitter) => ({
          id: emitter.id,
          name: emitter.name,
          uvX: emitter.uvX,
          uvY: emitter.uvY,
          radius: emitter.radius,
        })),
    [config.emitters],
  );

  const windMarks = useMemo(
    () =>
      config.windStations.map((station) => ({
        id: station.id,
        name: station.name,
        uvX: station.uvX,
        uvY: station.uvY,
        radius: station.radius,
        heading: station.heading,
      })),
    [config.windStations],
  );

  const spatialKind = open && tab === "Emitters" ? "emitters" : open && tab === "Wind" ? "wind" : null;

  return (
    <>
      <div ref={dashRef} className="dash" data-open={open ? "true" : "false"}>
        <header ref={headerRef} className="dash__header">
          <h2 className="dash__title">Dashboard</h2>
          <p className="dash__hint">Drag header to move · H panel · P perf · F fullscreen</p>
        </header>
        <div className="dash__tabs" role="tablist">
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              className="dash__tab"
              role="tab"
              data-active={tab === name ? "true" : "false"}
              aria-selected={tab === name}
              onClick={() => setTab(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="dash__body" data-tab={tab}>
          {tab === "Scene" ? <SceneTab config={config} live={live} commit={commit} /> : null}
          {tab === "Materials" ? <MaterialsTab config={config} live={live} patchFrom={patchFrom} /> : null}
          {tab === "Emitters" ? (
            <EmittersTab
              config={config}
              live={live}
              selectedId={selectedEmitterId}
              onSelect={setSelectedEmitterId}
              patchFrom={patchFrom}
            />
          ) : null}
          {tab === "Wind" ? (
            <WindTab
              config={config}
              live={live}
              selectedId={selectedWindId}
              onSelect={setSelectedWindId}
              patchFrom={patchFrom}
            />
          ) : null}
          {tab === "Drivers" ? (
            <DriversTab
              config={config}
              live={live}
              elapsed={elapsed}
              selectedEmitterId={selectedWaveId}
              selectedBindingId={selectedBindingId}
              onSelectEmitter={setSelectedWaveId}
              onSelectBinding={setSelectedBindingId}
              patchFrom={patchFrom}
            />
          ) : null}
          {tab === "Presets" ? (
            <PresetsTab engine={engine} setConfig={setConfig} persist={persist} />
          ) : null}
        </div>
        <div className="dash__actions">
          <button type="button" className="dash__btn" onClick={() => engine.reseed()}>
            Reseed
          </button>
          <button
            type="button"
            className="dash__btn"
            onClick={() => {
              commit(cloneConfig(defaultConfig), true);
            }}
          >
            Reset defaults
          </button>
        </div>
      </div>
      <button
        ref={fabRef}
        type="button"
        className="dash__fab"
        aria-label="Toggle dashboard"
        title="Click to toggle, drag to move"
        onClick={() => setOpen((current) => !current)}
      >
        Panel
      </button>
      <SpatialOverlay
        canvas={view}
        active={spatialKind === "emitters"}
        marks={pointMarks}
        selectedId={selectedEmitterId}
        onSelect={setSelectedEmitterId}
        onMove={(id, uv) =>
          patchFrom((current) => ({
            emitters: current.emitters.map((item) => (item.id === id ? { ...item, uvX: uv.u, uvY: uv.v } : item)),
          }))
        }
      />
      <SpatialOverlay
        canvas={view}
        active={spatialKind === "wind"}
        marks={windMarks}
        selectedId={selectedWindId}
        onSelect={setSelectedWindId}
        onMove={(id, uv) =>
          patchFrom((current) => ({
            windStations: current.windStations.map((item) =>
              item.id === id ? { ...item, uvX: uv.u, uvY: uv.v } : item,
            ),
          }))
        }
      />
    </>
  );
}

export function mountDashboard(
  engine: Engine,
  root: HTMLElement,
  options?: { canvas?: HTMLCanvasElement | null; persist?: boolean },
): () => void {
  root.hidden = false;
  let reactRoot: Root | null = createRoot(root);
  reactRoot.render(
    <Dashboard engine={engine} canvas={options?.canvas} persist={options?.persist ?? true} />,
  );
  return () => {
    reactRoot?.unmount();
    reactRoot = null;
    root.replaceChildren();
  };
}

function resolveViewCanvas(canvas?: HTMLCanvasElement | null): HTMLCanvasElement | null {
  if (canvas) {
    return canvas;
  }
  if (typeof document === "undefined") {
    return null;
  }
  const node = document.querySelector("#view");
  return node instanceof HTMLCanvasElement ? node : null;
}
