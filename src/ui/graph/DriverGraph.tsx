import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { FluidConfig, ValueBinding } from "../../app/config";
import { latestBindings } from "./connect";
import { layoutDriverGraph, portCenter, type GraphNode, type GraphPort } from "./layout";
import { isTypingTarget } from "../shortcuts";

export function DriverGraph({
  config,
  selectedEmitterId,
  selectedBindingId,
  onSelectEmitter,
  onSelectBinding,
  onConnect,
  onRemoveBinding,
}: {
  config: FluidConfig;
  selectedEmitterId: string | null;
  selectedBindingId: string | null;
  onSelectEmitter: (id: string) => void;
  onSelectBinding: (id: string | null) => void;
  onConnect: (emitterId: string, path: string) => void;
  onRemoveBinding: (id: string) => void;
}): ReactNode {
  const layout = useMemo(() => layoutDriverGraph(config), [config]);
  const wires = useMemo(() => layoutWires(config.valueBindings, layout.nodes), [config.valueBindings, layout.nodes]);
  const [drag, setDrag] = useState<{ emitterId: string; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.repeat || isTypingTarget(event.target) || !selectedBindingId) {
        return;
      }
      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }
      event.preventDefault();
      onRemoveBinding(selectedBindingId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onRemoveBinding, selectedBindingId]);

  const toSvg = (event: ReactPointerEvent): { x: number; y: number } => {
    const svg = svgRef.current;
    if (!svg) {
      return { x: 0, y: 0 };
    }
    const rect = svg.getBoundingClientRect();
    const scaleX = layout.width / Math.max(rect.width, 1);
    const scaleY = layout.height / Math.max(rect.height, 1);
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const finishDrag = (event: ReactPointerEvent): void => {
    if (!drag) {
      return;
    }
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const path =
      target instanceof Element ? target.closest("[data-port-path]")?.getAttribute("data-port-path") : null;
    if (path) {
      onConnect(drag.emitterId, path);
    }
    setDrag(null);
  };

  return (
    <div className="graph">
      <svg
        ref={svgRef}
        className="graph__svg"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-label="Value emitter bindings"
        onPointerMove={(event) => {
          if (!drag) {
            return;
          }
          setDrag({ ...drag, ...toSvg(event) });
        }}
        onPointerUp={finishDrag}
        onPointerCancel={() => setDrag(null)}
      >
        {layout.groups.map((group) => (
          <text key={group.id} className="graph__group" x={layout.nodes.find((n) => n.group === group.id)?.x ?? 0} y={group.y + 12}>
            {group.label}
          </text>
        ))}
        {wires.map((wire) => (
          <path
            key={wire.id}
            className="graph__wire"
            data-selected={selectedBindingId === wire.id ? "true" : "false"}
            d={wirePath(wire.x1, wire.y1, wire.x2, wire.y2)}
            onClick={(event) => {
              event.stopPropagation();
              onSelectBinding(wire.id);
            }}
          />
        ))}
        {drag
          ? (() => {
              const from = layout.nodes.find((node) => node.id === drag.emitterId);
              const port = from?.ports[0];
              if (!from || !port) {
                return null;
              }
              const start = portCenter(from, port, "out");
              return <path className="graph__wire graph__wire--temp" d={wirePath(start.x, start.y, drag.x, drag.y)} />;
            })()
          : null}
        {layout.nodes.map((node) =>
          node.kind === "emitter" ? (
            <EmitterNode
              key={node.id}
              node={node}
              selected={selectedEmitterId === node.id}
              onSelect={() => onSelectEmitter(node.id)}
              onPortDown={(event) => {
                event.stopPropagation();
                svgRef.current?.setPointerCapture(event.pointerId);
                setDrag({ emitterId: node.id, ...toSvg(event) });
                onSelectEmitter(node.id);
              }}
            />
          ) : (
            <TargetNode
              key={node.id}
              node={node}
              bindings={config.valueBindings}
              selectedEmitterId={selectedEmitterId}
            />
          ),
        )}
      </svg>
    </div>
  );
}

function EmitterNode({
  node,
  selected,
  onSelect,
  onPortDown,
}: {
  node: GraphNode;
  selected: boolean;
  onSelect: () => void;
  onPortDown: (event: ReactPointerEvent<SVGCircleElement>) => void;
}): ReactNode {
  const port = node.ports[0];
  const center = port ? portCenter(node, port, "out") : { x: node.x + node.width, y: node.y + node.height / 2 };
  return (
    <g className="graph__node" data-kind="emitter" data-selected={selected ? "true" : "false"} onClick={onSelect}>
      <rect className="graph__card" x={node.x} y={node.y} width={node.width} height={node.height} rx={8} />
      <text className="graph__label" x={node.x + 10} y={node.y + 18}>
        {node.label}
      </text>
      <circle className="graph__port graph__port--out" cx={center.x} cy={center.y} r={6} onPointerDown={onPortDown} />
    </g>
  );
}

function TargetNode({
  node,
  bindings,
  selectedEmitterId,
}: {
  node: GraphNode;
  bindings: readonly ValueBinding[];
  selectedEmitterId: string | null;
}): ReactNode {
  return (
    <g className="graph__node" data-kind="target">
      <rect className="graph__card" x={node.x} y={node.y} width={node.width} height={node.height} rx={8} />
      <text className="graph__label" x={node.x + 14} y={node.y + 16}>
        {node.label}
      </text>
      {node.ports.map((port) => {
        const center = portCenter(node, port, "in");
        const bound = bindings.some(
          (binding) => binding.path === port.path && (!selectedEmitterId || binding.emitterId === selectedEmitterId),
        );
        return (
          <g key={port.path}>
            <circle
              className="graph__port graph__port--in"
              data-port-path={port.path}
              data-bound={bound ? "true" : "false"}
              cx={center.x}
              cy={center.y}
              r={5}
            />
            <text className="graph__port-label" x={node.x + 12} y={center.y + 3}>
              {port.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

type Wire = { id: string; x1: number; y1: number; x2: number; y2: number };

function layoutWires(bindings: readonly ValueBinding[], nodes: readonly GraphNode[]): Wire[] {
  const emitters = new Map(nodes.filter((node) => node.kind === "emitter").map((node) => [node.id, node]));
  const portByPath = new Map<string, { node: GraphNode; port: GraphPort }>();
  for (const node of nodes) {
    if (node.kind !== "target") {
      continue;
    }
    for (const port of node.ports) {
      portByPath.set(port.path, { node, port });
    }
  }
  const wires: Wire[] = [];
  for (const binding of latestBindings(bindings)) {
    const from = emitters.get(binding.emitterId);
    const to = portByPath.get(binding.path);
    if (!from || !to || !from.ports[0]) {
      continue;
    }
    const a = portCenter(from, from.ports[0], "out");
    const b = portCenter(to.node, to.port, "in");
    wires.push({ id: binding.id, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }
  return wires;
}

function wirePath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}
