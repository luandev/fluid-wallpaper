import type { FluidConfig } from "../app/config";
import { defaultConfig } from "../app/config";

export type QualityBudgets = {
  simResolution: number;
  dyeResolution: number;
  pressureIterations: number;
};

export function phase1Budgets(config: FluidConfig = defaultConfig): QualityBudgets {
  return {
    simResolution: config.simResolution,
    dyeResolution: config.dyeResolution,
    pressureIterations: config.pressureIterations,
  };
}
