import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Engine } from "../app/engine";
import { mountPerfHud } from "../app/perfHud";
import { CONFIG_STORAGE_KEY, loadStoredConfig } from "../app/storage";
import type { FluidConfig } from "../app/config";
import { Dashboard } from "../ui/Dashboard";
import { resolveFieldConfig, resolveFieldOptions } from "./resolveFieldOptions";
import "./fluidField.css";

export type FluidFieldProps = {
  className?: string;
  style?: CSSProperties;
  /** Initial base look. Ignored when `persist` is on and a stored config already exists. */
  config?: Partial<FluidConfig>;
  /** Artist dashboard overlay. Default off. */
  dashboard?: boolean;
  /** Perf HUD. Default off. */
  perf?: boolean;
  /** Read/write `localStorage` for base config. Default off so embeds do not share the wallpaper tuner store. */
  persist?: boolean;
  onEngine?: (engine: Engine) => void;
  onError?: (message: string) => void;
};

export function FluidField({
  className,
  style,
  config,
  dashboard = false,
  perf = false,
  persist = false,
  onEngine,
  onError,
}: FluidFieldProps): ReactNode {
  const options = resolveFieldOptions({ dashboard, perf, persist });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const perfRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const onEngineRef = useRef(onEngine);
  const onErrorRef = useRef(onError);
  onEngineRef.current = onEngine;
  onErrorRef.current = onError;

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) {
      return;
    }
    setCanvas(node);
    const initial = options.persist
      ? loadStoredConfigIfPresent() ?? resolveFieldConfig(config)
      : resolveFieldConfig(config);
    let instance: Engine;
    try {
      instance = new Engine(node, initial);
      instance.start();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(message);
      onErrorRef.current?.(message);
      return;
    }
    setEngine(instance);
    onEngineRef.current?.(instance);
    return () => {
      instance.dispose();
      setEngine(null);
    };
    // Initial look only; later patches go through Engine.applyConfig.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const root = perfRef.current;
    if (!engine || !options.perf || !root) {
      return;
    }
    return mountPerfHud(engine, root);
  }, [engine, options.perf]);

  return (
    <div className={["fluid-field", className].filter(Boolean).join(" ")} style={style}>
      <canvas ref={canvasRef} className="fluid-field__canvas" />
      {error ? (
        <p className="fluid-field__fatal" role="alert">
          {error}
        </p>
      ) : null}
      {engine && options.dashboard ? (
        <Dashboard engine={engine} canvas={canvas} persist={options.persist} />
      ) : null}
      {options.perf ? <div ref={perfRef} className="fluid-field__perf" hidden /> : null}
    </div>
  );
}

function loadStoredConfigIfPresent(): FluidConfig | undefined {
  try {
    if (!localStorage.getItem(CONFIG_STORAGE_KEY)) {
      return undefined;
    }
    return loadStoredConfig();
  } catch {
    return undefined;
  }
}
