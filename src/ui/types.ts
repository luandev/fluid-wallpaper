import type { FluidConfig } from "../app/config";

export type CommitConfig = (patch: Partial<FluidConfig>, reseed?: boolean) => FluidConfig;

export type PatchFrom = (
  builder: (current: FluidConfig) => Partial<FluidConfig>,
  reseed?: boolean,
) => FluidConfig;
