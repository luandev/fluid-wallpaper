import { useRef, useState, type ReactNode } from "react";
import { cloneConfig, type FluidConfig } from "../../app/config";
import type { Engine } from "../../app/engine";
import {
  deletePreset,
  loadPresets,
  mergeImportedPresets,
  parsePresetJson,
  presetFilename,
  savePresets,
  upsertPreset,
  type FluidPreset,
} from "../../app/presets";
import { saveStoredConfig } from "../../app/storage";
import { downloadPresets } from "../presetFile";

export function PresetsTab({
  engine,
  setConfig,
}: {
  engine: Engine;
  setConfig: (config: FluidConfig) => void;
}): ReactNode {
  const [name, setName] = useState("");
  const [presets, setPresets] = useState<FluidPreset[]>(() => loadPresets());
  const [selectedId, setSelectedId] = useState(presets[0]?.id ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = (id?: string): void => {
    const next = loadPresets();
    setPresets(next);
    const pick = id && next.some((preset) => preset.id === id) ? id : next[0]?.id ?? "";
    setSelectedId(pick);
  };

  return (
    <section className="dash__group">
      <h3 className="dash__group-title">Presets</h3>
      <p className="dash__hint">Saves base config, including the driver graph. Load reseeds. Export/import JSON merges by name.</p>
      <label className="dash__row">
        <span className="dash__label">Name</span>
        <input
          className="dash__input dash__text"
          type="text"
          maxLength={48}
          placeholder="Preset name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label className="dash__row">
        <span className="dash__label">Saved</span>
        <select
          className="dash__input dash__select"
          value={selectedId}
          disabled={presets.length === 0}
          onChange={(event) => setSelectedId(event.target.value)}
        >
          {presets.length === 0 ? <option value="">No presets yet</option> : null}
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
      </label>
      <div className="dash__preset-actions">
        <button
          type="button"
          className="dash__btn"
          onClick={() => {
            try {
              const preset = upsertPreset(name, engine.getConfig());
              setName(preset.name);
              refresh(preset.id);
            } catch (error) {
              console.warn(error instanceof Error ? error.message : error);
            }
          }}
        >
          Save
        </button>
        <button
          type="button"
          className="dash__btn"
          disabled={!selectedId}
          onClick={() => {
            const preset = presets.find((item) => item.id === selectedId);
            if (!preset) {
              refresh();
              return;
            }
            const next = engine.applyConfig(cloneConfig(preset.config));
            saveStoredConfig(next);
            engine.reseed();
            setConfig(next);
            setName(preset.name);
            refresh(preset.id);
          }}
        >
          Load
        </button>
        <button
          type="button"
          className="dash__btn"
          disabled={!selectedId}
          onClick={() => {
            if (!selectedId) {
              return;
            }
            deletePreset(selectedId);
            refresh();
          }}
        >
          Delete
        </button>
      </div>
      <div className="dash__preset-actions">
        <button
          type="button"
          className="dash__btn"
          disabled={!selectedId}
          onClick={() => {
            const preset = presets.find((item) => item.id === selectedId);
            if (!preset) {
              refresh();
              return;
            }
            downloadPresets([preset], presetFilename(preset.name));
          }}
        >
          Export
        </button>
        <button
          type="button"
          className="dash__btn"
          disabled={presets.length === 0}
          onClick={() => downloadPresets(presets, "fluid-wallpaper-presets.json")}
        >
          Export all
        </button>
        <button type="button" className="dash__btn" onClick={() => fileRef.current?.click()}>
          Import
        </button>
        <input
          ref={fileRef}
          className="dash__file"
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) {
              return;
            }
            void file.text().then((text) => {
              const parsed = parsePresetJson(text);
              if (!parsed.ok) {
                console.warn(parsed.reason);
                return;
              }
              const merged = mergeImportedPresets(loadPresets(), parsed.presets);
              savePresets(merged);
              refresh(merged[0]?.id);
            });
          }}
        />
      </div>
    </section>
  );
}
