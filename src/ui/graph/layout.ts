import {
  EMITTER_DRIVE_FIELDS,
  MATERIAL_DRIVE_FIELDS,
  RESEED_KEYS,
  WIND_DRIVE_FIELDS,
  controlSchema,
  type FluidConfig,
} from "../../app/config";

export type GraphPort = {
  path: string;
  label: string;
  y: number;
};

export type GraphNode = {
  id: string;
  kind: "emitter" | "target" | "label";
  label: string;
  group?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  ports: GraphPort[];
};

export type GraphGroup = {
  id: string;
  label: string;
};

export type GraphLayout = {
  nodes: GraphNode[];
  groups: Array<GraphGroup & { y: number }>;
  width: number;
  height: number;
};

const PAD = 16;
const NODE_W = 176;
const COL_GAP = 200;
const HEADER_H = 26;
const PORT_H = 16;
const GROUP_GAP = 18;
const NODE_GAP = 10;

export function layoutDriverGraph(config: FluidConfig): GraphLayout {
  const nodes: GraphNode[] = [];
  let leftY = PAD;
  for (const emitter of config.valueEmitters) {
    nodes.push({
      id: emitter.id,
      kind: "emitter",
      label: emitter.name,
      x: PAD,
      y: leftY,
      width: NODE_W,
      height: HEADER_H + 12,
      ports: [{ path: emitter.id, label: "out", y: HEADER_H / 2 + 6 }],
    });
    leftY += HEADER_H + 22;
  }

  const rightX = PAD + NODE_W + COL_GAP;
  const groups: Array<GraphGroup & { y: number; nodes: GraphNode[] }> = [
    {
      id: "scene",
      label: "Scene",
      y: 0,
      nodes: [
        {
          id: "scene-root",
          kind: "target",
          label: "Scene",
          group: "scene",
          x: rightX,
          y: 0,
          width: NODE_W + 8,
          height: 0,
          ports: controlSchema
            .filter(
              (control) =>
                control.kind === "range" &&
                control.min !== undefined &&
                control.max !== undefined &&
                !RESEED_KEYS.has(control.key),
            )
            .map((control) => ({ path: String(control.key), label: control.label, y: 0 })),
        },
      ],
    },
    {
      id: "materials",
      label: "Materials",
      y: 0,
      nodes: config.materials.map((material) => ({
        id: `mat:${material.id}`,
        kind: "target" as const,
        label: material.name,
        group: "materials",
        x: rightX,
        y: 0,
        width: NODE_W + 8,
        height: 0,
        ports: MATERIAL_DRIVE_FIELDS.map((field) => ({
          path: `materials.${material.id}.${field.key}`,
          label: field.label,
          y: 0,
        })),
      })),
    },
    {
      id: "emitters",
      label: "Emitters",
      y: 0,
      nodes: config.emitters.map((emitter) => ({
        id: `emit:${emitter.id}`,
        kind: "target" as const,
        label: emitter.name,
        group: "emitters",
        x: rightX,
        y: 0,
        width: NODE_W + 8,
        height: 0,
        ports: EMITTER_DRIVE_FIELDS.map((field) => ({
          path: `emitters.${emitter.id}.${field.key}`,
          label: field.label,
          y: 0,
        })),
      })),
    },
    {
      id: "wind",
      label: "Wind",
      y: 0,
      nodes: config.windStations.map((station) => ({
        id: `wind:${station.id}`,
        kind: "target" as const,
        label: station.name,
        group: "wind",
        x: rightX,
        y: 0,
        width: NODE_W + 8,
        height: 0,
        ports: WIND_DRIVE_FIELDS.map((field) => ({
          path: `windStations.${station.id}.${field.key}`,
          label: field.label,
          y: 0,
        })),
      })),
    },
  ];

  let rightY = PAD;
  const placedGroups: Array<GraphGroup & { y: number }> = [];
  for (const group of groups) {
    if (group.nodes.length === 0) {
      continue;
    }
    placedGroups.push({ id: group.id, label: group.label, y: rightY });
    rightY += GROUP_GAP;
    for (const node of group.nodes) {
      const height = HEADER_H + Math.max(1, node.ports.length) * PORT_H + 8;
      const ports = node.ports.map((port, index) => ({
        ...port,
        y: HEADER_H + index * PORT_H + PORT_H / 2,
      }));
      nodes.push({ ...node, y: rightY, height, ports });
      rightY += height + NODE_GAP;
    }
  }

  return {
    nodes,
    groups: placedGroups,
    width: rightX + NODE_W + PAD + 24,
    height: Math.max(leftY, rightY) + PAD,
  };
}

export function portCenter(node: GraphNode, port: GraphPort, side: "out" | "in"): { x: number; y: number } {
  return {
    x: side === "out" ? node.x + node.width : node.x,
    y: node.y + port.y,
  };
}
