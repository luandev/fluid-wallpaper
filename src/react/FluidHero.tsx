import {
  createElement,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  defineFluidHero,
  type FluidHeroElement,
  type FluidInkQuality,
} from "../hero";
import type { FluidConfig } from "../app/config";
export interface FluidHeroProps {
  children?: ReactNode;
  preset?: string;
  config?: Partial<FluidConfig>;
  quality?: FluidInkQuality;
  paused?: boolean;
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
  onReady?: (event: CustomEvent) => void;
  onError?: (event: CustomEvent) => void;
  onConfigChange?: (event: CustomEvent) => void;
  onQualityChange?: (event: CustomEvent) => void;
}
export function FluidHero({
  children,
  preset = "aurora",
  config,
  quality = "eco",
  paused = false,
  interactive = false,
  className,
  style,
  ...callbacks
}: FluidHeroProps): ReactNode {
  const ref = useRef<FluidHeroElement>(null);
  const latest = useRef(callbacks);
  latest.current = callbacks;
  useEffect(() => {
    const host = ref.current!;
    const bindings = [
      ["ready", "onReady"],
      ["error", "onError"],
      ["configchange", "onConfigChange"],
      ["qualitychange", "onQualityChange"],
    ] as const;
    const handlers = bindings.map(([name, key]) => {
      const handler = (e: Event) => latest.current[key]?.(e as CustomEvent);
      host.addEventListener(name, handler);
      return { name, handler };
    });
    defineFluidHero();
    return () => {
      handlers.forEach(({ name, handler }) =>
        host.removeEventListener(name, handler),
      );
      host.pause();
    };
  }, []);
  useEffect(() => {
    if (ref.current) {
      ref.current.config = config ?? {};
      ref.current.toggleAttribute("paused", paused);
    }
  }, [config, paused]);
  return createElement(
    "fluid-hero",
    {
      ref,
      preset,
      quality,
      paused: paused ? "" : undefined,
      interactive: interactive ? "" : undefined,
      className,
      style,
    },
    children,
  );
}
