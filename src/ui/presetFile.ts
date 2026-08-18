import { serializePresetDocument, type PresetDocument } from "../app/presets";

export function downloadPresetDocument(documentToSave: PresetDocument, filename: string): void {
  const blob = new Blob([JSON.stringify(documentToSave, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadPresets(list: Parameters<typeof serializePresetDocument>[0], filename: string): void {
  downloadPresetDocument(serializePresetDocument(list), filename);
}
