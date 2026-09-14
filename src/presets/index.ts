import { sanitizeConfig, type FluidConfig } from "../app/config";
import { PRESET_DOCUMENT_KIND, type PresetDocument } from "../app/presets";

export interface FluidPresetInfo {
  id: string;
  name: string;
  description: string;
  character: string;
  accent: string;
  author: string;
  license: string;
  tags: string[];
}
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item).sort(([a], [b]) => a.localeCompare(b)),
        )
      : item,
  );
export function validateCatalogEntry(
  id: string,
  metadata: unknown,
  document: unknown,
): { info: FluidPresetInfo; document: PresetDocument } {
  const info = metadata as FluidPresetInfo,
    doc = document as PresetDocument;
  if (
    !/^[a-z][a-z0-9-]*$/.test(id) ||
    !info ||
    info.id !== id ||
    ![info.name, info.description, info.character, info.author].every(
      (v) => typeof v === "string" && v.trim(),
    ) ||
    info.license !== "MIT" ||
    !/^#[0-9a-f]{6}$/i.test(info.accent) ||
    !Array.isArray(info.tags) ||
    !info.tags.length ||
    !info.tags.every((v) => typeof v === "string" && v.trim())
  )
    throw new Error(`Invalid preset metadata: ${id}`);
  if (
    doc?.kind !== PRESET_DOCUMENT_KIND ||
    doc.presets?.length !== 1 ||
    doc.presets[0].id !== id ||
    doc.presets[0].name !== info.name ||
    !Number.isFinite(doc.presets[0].updatedAt)
  )
    throw new Error(`Invalid preset document: ${id}`);
  const config = sanitizeConfig(doc.presets[0].config);
  if (canonical(config) !== canonical(doc.presets[0].config))
    throw new Error(
      `Preset ${id} contains invalid, missing or unsupported config fields; export a current full preset`,
    );
  if (
    config.youtubeUrl ||
    config.valueEmitters.some((v) =>
      ["audioPulse", "audioSpectrum", "camera", "tilt"].includes(v.kind),
    )
  )
    throw new Error(`Gallery presets must work without optional media: ${id}`);
  return { info: structuredClone(info), document: structuredClone(doc) };
}
const metadata = import.meta.glob("../../presets/*/metadata.json", {
  eager: true,
  import: "default",
});
const documents = import.meta.glob("../../presets/*/preset.json", {
  eager: true,
  import: "default",
});
const entries = Object.entries(metadata).map(([path, info]) =>
  validateCatalogEntry(
    path.split("/").at(-2)!,
    info,
    documents[path.replace("metadata.json", "preset.json")],
  ),
);
if (
  Object.keys(documents).length !== entries.length ||
  new Set(entries.map((e) => e.info.id)).size !== entries.length
)
  throw new Error("Preset catalog has missing metadata or duplicate IDs");
export const fluidPresets: readonly Readonly<FluidPresetInfo>[] = Object.freeze(
  entries
    .map((e) =>
      Object.freeze({
        ...e.info,
        tags: Object.freeze(e.info.tags) as unknown as string[],
      }),
    )
    .sort((a, b) => a.name.localeCompare(b.name)),
);
export function getFluidPreset(id: string): FluidConfig {
  const entry = entries.find((e) => e.info.id === id);
  if (!entry) throw new Error(`Unknown fluid preset: ${id}`);
  return structuredClone(entry.document.presets[0].config);
}
export function getFluidPresetDocument(id: string): PresetDocument {
  const entry = entries.find((e) => e.info.id === id);
  if (!entry) throw new Error(`Unknown fluid preset: ${id}`);
  return structuredClone(entry.document);
}
