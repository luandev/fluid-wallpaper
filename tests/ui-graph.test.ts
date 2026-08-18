import { describe, expect, it } from "vitest";
import {
  CRIMSON_MATERIAL_ID,
  MAX_VALUE_BINDINGS,
  cloneConfig,
  defaultConfig,
  type ValueBinding,
  type ValueEmitter,
} from "../src/app/config";
import { connectPorts, latestBindings, removeBinding } from "../src/ui/graph/connect";
import { layoutDriverGraph } from "../src/ui/graph/layout";

function wave(id: string): ValueEmitter {
  return {
    id,
    name: id,
    enabled: true,
    kind: "sine",
    rate: 0.25,
    phase: 0,
    from: 0,
    to: 1,
    scale: 1,
  };
}

describe("driver graph connect", () => {
  it("lets the last connection win per path", () => {
    const config = cloneConfig(defaultConfig);
    config.valueEmitters = [wave("a"), wave("b")];
    config.valueBindings = [{ id: "bind-1", emitterId: "a", path: "vorticity", amount: 0.4 }];
    const next = connectPorts(config, "b", "vorticity");
    expect(next).toBeDefined();
    const latest = latestBindings(next ?? []);
    expect(latest).toHaveLength(1);
    expect(latest[0]?.emitterId).toBe("b");
    expect(latest[0]?.amount).toBe(0.4);
  });

  it("rejects a 17th unique path", () => {
    const config = cloneConfig(defaultConfig);
    config.valueEmitters = [wave("a")];
    const paths = [
      "vorticity",
      "windStrength",
      "velocityDecay",
      "splatForce",
      "composerStrength",
      "composerBroad",
      "composerMedium",
      "composerFine",
      "noiseScale",
      "noiseTime",
      "wiggleAmount",
      "dyeInject",
      "dyeDecay",
      "contrast",
      "colorTweenSpeed",
      `materials.${CRIMSON_MATERIAL_ID}.glow`,
    ];
    expect(paths).toHaveLength(MAX_VALUE_BINDINGS);
    config.valueBindings = paths.map((path, index) => ({
      id: `bind-${index}`,
      emitterId: "a",
      path,
      amount: 1,
    })) as ValueBinding[];
    expect(connectPorts(config, "a", `materials.${CRIMSON_MATERIAL_ID}.viscosity`)).toBeUndefined();
    expect(connectPorts(config, "a", paths[0] ?? "vorticity")).toHaveLength(MAX_VALUE_BINDINGS);
  });

  it("drops a binding by id", () => {
    const next = removeBinding(
      [
        { id: "a", emitterId: "w", path: "vorticity", amount: 1 },
        { id: "b", emitterId: "w", path: "dyeInject", amount: 1 },
      ],
      "a",
    );
    expect(next.map((binding) => binding.id)).toEqual(["b"]);
  });

  it("lays emitters on the left and targets on the right", () => {
    const config = cloneConfig(defaultConfig);
    config.valueEmitters = [wave("a")];
    const layout = layoutDriverGraph(config);
    const emitter = layout.nodes.find((node) => node.kind === "emitter");
    const target = layout.nodes.find((node) => node.kind === "target");
    expect(emitter).toBeDefined();
    expect(target).toBeDefined();
    expect(emitter && target ? emitter.x < target.x : false).toBe(true);
    expect(layout.width).toBeGreaterThan(layout.nodes[0]?.width ?? 0);
  });
});
