import type { Engine } from "./engine";
import {
  MAX_EMITTERS,
  MAX_MATERIALS,
  MAX_WIND_STATIONS,
  MIN_MATERIALS,
  cloneConfig,
  controlSchema,
  createEmitter,
  createMaterial,
  createWindStation,
  defaultConfig,
  sanitizeConfig,
  scatterWindStations,
  type ControlDef,
  type ControlGroup,
  type EmitterKind,
  type FluidConfig,
  type FluidEmitter,
  type FluidMaterial,
  type WindStation,
} from "./config";
import {
  deletePreset,
  loadPresets,
  upsertPreset,
  type FluidPreset,
} from "./presets";

const STORAGE_KEY = "fluid-wallpaper.config.v8";
const GROUPS: ControlGroup[] = ["Look", "Flow", "Composer", "Quality", "Input"];

export function loadStoredConfig(): FluidConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return cloneConfig(defaultConfig);
    }
    return sanitizeConfig(JSON.parse(raw) as unknown);
  } catch {
    return cloneConfig(defaultConfig);
  }
}

export function saveStoredConfig(config: FluidConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function mountDashboard(engine: Engine, root: HTMLElement): () => void {
  let config = engine.getConfig();
  root.replaceChildren();
  root.className = "dash";
  root.dataset.open = "true";

  const header = el("div", "dash__header");
  const title = el("h2", "dash__title", "Tuner");
  const hint = el(
    "p",
    "dash__hint",
    "H hides tuner · F hides perf · presets stay in localStorage for later looks / animation options",
  );
  header.append(title, hint);

  const body = el("div", "dash__body");
  const controls = new Map<keyof FluidConfig, HTMLInputElement | HTMLSelectElement>();

  for (const group of GROUPS) {
    const section = el("section", "dash__group");
    section.append(el("h3", "dash__group-title", group));
    for (const def of controlSchema.filter((control) => control.group === group)) {
      const row = buildControl(def, config, (key, value, reseed) => {
        config = engine.applyConfig({ [key]: value });
        syncInputs(controls, config);
        saveStoredConfig(config);
        if (reseed) {
          engine.reseed();
        }
      });
      controls.set(def.key, row.input);
      section.append(row.row);
    }
    body.append(section);
  }

  const materialsSection = el("section", "dash__group");
  const emittersSection = el("section", "dash__group");
  const windSection = el("section", "dash__group");
  const lookGroup = body.querySelector(".dash__group");
  if (lookGroup?.nextSibling) {
    body.insertBefore(materialsSection, lookGroup.nextSibling);
    body.insertBefore(emittersSection, materialsSection.nextSibling);
    body.insertBefore(windSection, emittersSection.nextSibling);
  } else {
    body.append(materialsSection, emittersSection, windSection);
  }

  const commit = (builder: (current: FluidConfig) => Partial<FluidConfig>, rebuild: boolean): void => {
    config = engine.applyConfig(builder(engine.getConfig()));
    saveStoredConfig(config);
    if (rebuild) {
      refreshLists();
    }
  };

  const refreshLists = (): void => {
    config = engine.getConfig();
    renderMaterials(materialsSection, config, commit);
    renderEmitters(emittersSection, config, commit);
    renderWind(windSection, config, commit);
  };
  refreshLists();

  const presetsSection = el("section", "dash__group");
  presetsSection.append(el("h3", "dash__group-title", "Presets"));

  const nameRow = el("div", "dash__row");
  const nameInput = document.createElement("input");
  nameInput.className = "dash__input dash__text";
  nameInput.type = "text";
  nameInput.placeholder = "Preset name";
  nameInput.maxLength = 48;
  nameInput.autocomplete = "off";
  nameRow.append(nameInput);

  const selectRow = el("div", "dash__row");
  const select = document.createElement("select");
  select.className = "dash__input dash__select";
  selectRow.append(select);

  const presetActions = el("div", "dash__preset-actions");
  const refreshSelect = (selectedId?: string): void => {
    const presets = loadPresets();
    select.replaceChildren();
    if (presets.length === 0) {
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "No presets yet";
      select.append(empty);
      select.disabled = true;
      return;
    }
    select.disabled = false;
    for (const preset of presets) {
      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = preset.name;
      select.append(option);
    }
    const pick =
      selectedId && presets.some((preset) => preset.id === selectedId)
        ? selectedId
        : presets[0]?.id ?? "";
    select.value = pick;
  };

  const saveBtn = button("Save", () => {
    try {
      config = engine.getConfig();
      const preset = upsertPreset(nameInput.value, config);
      nameInput.value = preset.name;
      refreshSelect(preset.id);
    } catch (error) {
      console.warn(error instanceof Error ? error.message : error);
    }
  });
  const loadBtn = button("Load", () => {
    const id = select.value;
    if (!id) {
      return;
    }
    const presets = loadPresets();
    const preset = presets.find((item: FluidPreset) => item.id === id);
    if (!preset) {
      refreshSelect();
      return;
    }
    config = engine.applyConfig(cloneConfig(preset.config));
    syncInputs(controls, config);
    saveStoredConfig(config);
    nameInput.value = preset.name;
    engine.reseed();
    refreshLists();
    refreshSelect(preset.id);
  });
  const deleteBtn = button("Delete", () => {
    const id = select.value;
    if (!id) {
      return;
    }
    deletePreset(id);
    refreshSelect();
  });
  presetActions.append(saveBtn, loadBtn, deleteBtn);
  presetsSection.append(nameRow, selectRow, presetActions);
  body.append(presetsSection);
  refreshSelect();

  const actions = el("div", "dash__actions");
  const reseedBtn = button("Reseed", () => engine.reseed());
  const resetBtn = button("Reset defaults", () => {
    config = engine.applyConfig(cloneConfig(defaultConfig));
    syncInputs(controls, config);
    saveStoredConfig(config);
    engine.reseed();
    refreshLists();
  });
  actions.append(reseedBtn, resetBtn);

  const toggle = button("Tuner", () => {
    const open = root.dataset.open !== "true";
    root.dataset.open = open ? "true" : "false";
  });
  toggle.className = "dash__fab";
  toggle.setAttribute("aria-label", "Toggle tuner");

  root.append(header, body, actions);

  const host = root.parentElement ?? document.body;
  host.append(toggle);

  const onKey = (event: KeyboardEvent): void => {
    if (event.code !== "KeyH" || event.repeat) {
      return;
    }
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" || target.tagName === "SELECT" || target.isContentEditable)
    ) {
      return;
    }
    const open = root.dataset.open !== "true";
    root.dataset.open = open ? "true" : "false";
  };
  window.addEventListener("keydown", onKey);

  return () => {
    window.removeEventListener("keydown", onKey);
    toggle.remove();
    root.replaceChildren();
  };
}

type ListCommit = (builder: (current: FluidConfig) => Partial<FluidConfig>, rebuild: boolean) => void;

function renderMaterials(section: HTMLElement, config: FluidConfig, onPatch: ListCommit): void {
  section.replaceChildren();
  const heading = el("div", "dash__group-head");
  heading.append(el("h3", "dash__group-title", "Materials"));
  const addBtn = button("Add", () => {
    onPatch((current) => {
      const material = createMaterial(current.materials);
      return material ? { materials: [...current.materials, material] } : {};
    }, true);
  });
  addBtn.disabled = config.materials.length >= MAX_MATERIALS;
  heading.append(addBtn);
  section.append(heading);

  for (const material of config.materials) {
    section.append(
      renderMaterialCard(material, config, (patch, remove) => {
        onPatch((current) => {
          if (remove) {
            if (current.materials.length <= MIN_MATERIALS) {
              return {};
            }
            const materials = current.materials.filter((item) => item.id !== material.id);
            const fallback = materials[0]?.id ?? material.id;
            const emitters = current.emitters.map((emitter) =>
              emitter.materialId === material.id ? { ...emitter, materialId: fallback } : emitter,
            );
            return { materials, emitters };
          }
          return {
            materials: current.materials.map((item) => (item.id === material.id ? { ...item, ...patch } : item)),
          };
        }, remove);
      }),
    );
  }
}

function renderMaterialCard(
  material: FluidMaterial,
  config: FluidConfig,
  onChange: (patch: Partial<FluidMaterial>, remove: boolean) => void,
): HTMLElement {
  const card = el("div", "dash__item");
  const head = el("div", "dash__item-head");
  const nameInput = document.createElement("input");
  nameInput.className = "dash__input dash__text";
  nameInput.type = "text";
  nameInput.value = material.name;
  nameInput.maxLength = 32;
  nameInput.addEventListener("change", () => {
    onChange({ name: nameInput.value }, false);
  });
  const removeBtn = button("Remove", () => onChange({}, true));
  removeBtn.disabled = config.materials.length <= MIN_MATERIALS;
  head.append(nameInput, removeBtn);
  card.append(head);

  card.append(
    toggleRow("Enabled", material.enabled, (enabled) => onChange({ enabled }, false)),
    colorRow("Color", material.color, (color) => onChange({ color }, false)),
    colorRow("Color B", material.colorB, (colorB) => onChange({ colorB }, false)),
    rangeRow("Viscosity", material.viscosity, 0, 1, 0.01, (viscosity) => onChange({ viscosity }, false)),
    rangeRow("Roughness", material.roughness, 0, 1, 0.01, (roughness) => onChange({ roughness }, false)),
    rangeRow("Metallic", material.metallic, 0, 1, 0.01, (metallic) => onChange({ metallic }, false)),
    rangeRow("Sheen", material.sheen, 0, 1, 0.01, (sheen) => onChange({ sheen }, false)),
    rangeRow("Glow", material.glow, 0, 1, 0.01, (glow) => onChange({ glow }, false)),
  );
  return card;
}

function renderEmitters(section: HTMLElement, config: FluidConfig, onPatch: ListCommit): void {
  section.replaceChildren();
  const heading = el("div", "dash__group-head");
  heading.append(el("h3", "dash__group-title", "Emitters"));
  const addBtn = button("Add", () => {
    onPatch((current) => {
      const emitter = createEmitter(current.emitters, current.materials);
      return emitter ? { emitters: [...current.emitters, emitter] } : {};
    }, true);
  });
  addBtn.disabled = config.emitters.length >= MAX_EMITTERS;
  heading.append(addBtn);
  section.append(heading);

  for (const emitter of config.emitters) {
    section.append(
      renderEmitterCard(emitter, config, (patch, remove, rebuild) => {
        onPatch((current) => {
          if (remove) {
            return { emitters: current.emitters.filter((item) => item.id !== emitter.id) };
          }
          return {
            emitters: current.emitters.map((item) => (item.id === emitter.id ? { ...item, ...patch } : item)),
          };
        }, rebuild);
      }),
    );
  }
}

function renderEmitterCard(
  emitter: FluidEmitter,
  config: FluidConfig,
  onChange: (patch: Partial<FluidEmitter>, remove: boolean, rebuild: boolean) => void,
): HTMLElement {
  const card = el("div", "dash__item");
  const head = el("div", "dash__item-head");
  const nameInput = document.createElement("input");
  nameInput.className = "dash__input dash__text";
  nameInput.type = "text";
  nameInput.value = emitter.name;
  nameInput.maxLength = 32;
  nameInput.addEventListener("change", () => {
    onChange({ name: nameInput.value }, false, false);
  });
  const removeBtn = button("Remove", () => onChange({}, true, true));
  head.append(nameInput, removeBtn);
  card.append(head, toggleRow("Enabled", emitter.enabled, (enabled) => onChange({ enabled }, false, false)));

  const kindRow = el("label", "dash__row");
  const kindMeta = el("div", "dash__meta");
  kindMeta.append(el("span", "dash__label", "Kind"), el("span", "dash__value", emitter.kind));
  const kindSelect = document.createElement("select");
  kindSelect.className = "dash__input dash__select";
  for (const kind of ["field", "point", "pointer"] as const) {
    const option = document.createElement("option");
    option.value = kind;
    option.textContent = kind[0].toUpperCase() + kind.slice(1);
    kindSelect.append(option);
  }
  kindSelect.value = emitter.kind;
  kindSelect.addEventListener("change", () => {
    onChange({ kind: kindSelect.value as EmitterKind }, false, true);
  });
  kindRow.append(kindMeta, kindSelect);
  card.append(kindRow);

  const matRow = el("label", "dash__row");
  const matMeta = el("div", "dash__meta");
  const currentName = config.materials.find((material) => material.id === emitter.materialId)?.name ?? emitter.materialId;
  matMeta.append(el("span", "dash__label", "Material"), el("span", "dash__value", currentName));
  const matSelect = document.createElement("select");
  matSelect.className = "dash__input dash__select";
  for (const material of config.materials) {
    const option = document.createElement("option");
    option.value = material.id;
    option.textContent = material.name;
    matSelect.append(option);
  }
  matSelect.value = emitter.materialId;
  matSelect.addEventListener("change", () => {
    onChange({ materialId: matSelect.value }, false, false);
  });
  matRow.append(matMeta, matSelect);
  card.append(matRow);

  card.append(rangeRow("Rate", emitter.rate, 0, 1, 0.01, (rate) => onChange({ rate }, false, false)));
  if (emitter.kind !== "field") {
    card.append(
      rangeRow("Radius", emitter.radius, 0.00005, 0.25, 0.00005, (radius) => onChange({ radius }, false, false)),
    );
  }
  if (emitter.kind === "point") {
    card.append(
      rangeRow("U", emitter.uvX, 0, 1, 0.01, (uvX) => onChange({ uvX }, false, false)),
      rangeRow("V", emitter.uvY, 0, 1, 0.01, (uvY) => onChange({ uvY }, false, false)),
    );
  }
  if (emitter.kind === "field") {
    card.append(
      rangeRow("Noise offset", emitter.noiseOffset, 0, 1, 0.01, (noiseOffset) =>
        onChange({ noiseOffset }, false, false),
      ),
    );
  }
  return card;
}

function renderWind(section: HTMLElement, config: FluidConfig, onPatch: ListCommit): void {
  section.replaceChildren();
  const heading = el("div", "dash__group-head");
  heading.append(el("h3", "dash__group-title", "Wind"));
  const actions = el("div", "dash__preset-actions");
  const scatterBtn = button("Scatter", () => {
    onPatch(() => ({ windStations: scatterWindStations(4) }), true);
  });
  const addBtn = button("Add", () => {
    onPatch((current) => {
      const station = createWindStation(current.windStations);
      return station ? { windStations: [...current.windStations, station] } : {};
    }, true);
  });
  addBtn.disabled = config.windStations.length >= MAX_WIND_STATIONS;
  actions.append(scatterBtn, addBtn);
  heading.append(actions);
  section.append(heading);
  const hint = el(
    "p",
    "dash__hint",
    "2D stations like sparse wind data: heading/speed for stream, spin for vorticity. Live weather files stay later.",
  );
  hint.style.marginBottom = "8px";
  section.append(hint);

  for (const station of config.windStations) {
    section.append(
      renderWindCard(station, (patch, remove) => {
        onPatch((current) => {
          if (remove) {
            return { windStations: current.windStations.filter((item) => item.id !== station.id) };
          }
          return {
            windStations: current.windStations.map((item) =>
              item.id === station.id ? { ...item, ...patch } : item,
            ),
          };
        }, remove);
      }),
    );
  }
}

function renderWindCard(
  station: WindStation,
  onChange: (patch: Partial<WindStation>, remove: boolean) => void,
): HTMLElement {
  const card = el("div", "dash__item");
  const head = el("div", "dash__item-head");
  const nameInput = document.createElement("input");
  nameInput.className = "dash__input dash__text";
  nameInput.type = "text";
  nameInput.value = station.name;
  nameInput.maxLength = 32;
  nameInput.addEventListener("change", () => {
    onChange({ name: nameInput.value }, false);
  });
  const removeBtn = button("Remove", () => onChange({}, true));
  head.append(nameInput, removeBtn);
  card.append(head);
  card.append(
    toggleRow("Enabled", station.enabled, (enabled) => onChange({ enabled }, false)),
    rangeRow("U", station.uvX, 0, 1, 0.01, (uvX) => onChange({ uvX }, false)),
    rangeRow("V", station.uvY, 0, 1, 0.01, (uvY) => onChange({ uvY }, false)),
    rangeRow("Heading", station.heading, 0, 1, 0.01, (heading) => onChange({ heading }, false)),
    rangeRow("Speed", station.speed, 0, 1, 0.01, (speed) => onChange({ speed }, false)),
    rangeRow("Spin", station.spin, -1, 1, 0.01, (spin) => onChange({ spin }, false)),
    rangeRow("Radius", station.radius, 0.04, 0.45, 0.01, (radius) => onChange({ radius }, false)),
  );
  return card;
}

function toggleRow(label: string, value: boolean, onChange: (next: boolean) => void): HTMLElement {
  const row = el("label", "dash__row");
  const valueLabel = el("span", "dash__value", value ? "on" : "off");
  const meta = el("div", "dash__meta");
  meta.append(el("span", "dash__label", label), valueLabel);
  const input = document.createElement("input");
  input.className = "dash__input";
  input.type = "checkbox";
  input.checked = value;
  input.addEventListener("change", () => {
    valueLabel.textContent = input.checked ? "on" : "off";
    onChange(input.checked);
  });
  row.append(meta, input);
  return row;
}

function colorRow(label: string, value: string, onChange: (next: string) => void): HTMLElement {
  const row = el("label", "dash__row");
  const valueLabel = el("span", "dash__value", value);
  const meta = el("div", "dash__meta");
  meta.append(el("span", "dash__label", label), valueLabel);
  const input = document.createElement("input");
  input.className = "dash__input";
  input.type = "color";
  input.value = value;
  input.addEventListener("input", () => {
    valueLabel.textContent = input.value;
    onChange(input.value);
  });
  row.append(meta, input);
  return row;
}

function rangeRow(
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
  onChange: (next: number) => void,
): HTMLElement {
  const row = el("label", "dash__row");
  const valueLabel = el("span", "dash__value", formatNumber(value, step));
  const meta = el("div", "dash__meta");
  meta.append(el("span", "dash__label", label), valueLabel);
  const input = document.createElement("input");
  input.className = "dash__input";
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.addEventListener("input", () => {
    const numeric = Number(input.value);
    valueLabel.textContent = formatNumber(numeric, step);
    onChange(numeric);
  });
  row.append(meta, input);
  return row;
}

function buildControl(
  def: ControlDef,
  config: FluidConfig,
  onChange: (key: keyof FluidConfig, value: FluidConfig[keyof FluidConfig], reseed: boolean) => void,
): { row: HTMLElement; input: HTMLInputElement | HTMLSelectElement } {
  const row = el("label", "dash__row");
  const name = el("span", "dash__label", def.label);
  const valueLabel = el("span", "dash__value");

  if (def.kind === "select") {
    const select = document.createElement("select");
    select.className = "dash__input dash__select";
    for (const optionDef of def.options ?? []) {
      const option = document.createElement("option");
      option.value = optionDef.value;
      option.textContent = optionDef.label;
      select.append(option);
    }
    select.value = String(config[def.key]);
    valueLabel.textContent = select.options[select.selectedIndex]?.textContent ?? select.value;
    select.addEventListener("change", () => {
      valueLabel.textContent = select.options[select.selectedIndex]?.textContent ?? select.value;
      onChange(def.key, select.value as FluidConfig[keyof FluidConfig], Boolean(def.reseed));
    });
    const meta = el("div", "dash__meta");
    meta.append(name, valueLabel);
    row.append(meta, select);
    return { row, input: select };
  }

  const input = document.createElement("input");
  input.className = "dash__input";

  if (def.kind === "color") {
    input.type = "color";
    input.value = String(config[def.key]);
    valueLabel.textContent = input.value;
    input.addEventListener("input", () => {
      valueLabel.textContent = input.value;
      onChange(def.key, input.value as FluidConfig[keyof FluidConfig], false);
    });
  } else if (def.kind === "toggle") {
    input.type = "checkbox";
    input.checked = Boolean(config[def.key]);
    valueLabel.textContent = input.checked ? "on" : "off";
    input.addEventListener("change", () => {
      valueLabel.textContent = input.checked ? "on" : "off";
      onChange(def.key, input.checked, false);
    });
  } else {
    input.type = "range";
    input.min = String(def.min);
    input.max = String(def.max);
    input.step = String(def.step ?? 0.01);
    input.value = String(config[def.key]);
    valueLabel.textContent = formatNumber(Number(input.value), def.step);
    input.addEventListener("input", () => {
      const numeric = Number(input.value);
      valueLabel.textContent = formatNumber(numeric, def.step);
      onChange(def.key, numeric, Boolean(def.reseed));
    });
  }

  const meta = el("div", "dash__meta");
  meta.append(name, valueLabel);
  row.append(meta, input);
  return { row, input };
}

function syncInputs(
  controls: Map<keyof FluidConfig, HTMLInputElement | HTMLSelectElement>,
  config: FluidConfig,
): void {
  for (const def of controlSchema) {
    const input = controls.get(def.key);
    if (!input) {
      continue;
    }
    const value = config[def.key];
    const row = input.closest(".dash__row");
    const valueLabel = row?.querySelector(".dash__value");
    if (def.kind === "toggle" && input instanceof HTMLInputElement) {
      input.checked = Boolean(value);
      if (valueLabel) {
        valueLabel.textContent = input.checked ? "on" : "off";
      }
    } else if (def.kind === "select" && input instanceof HTMLSelectElement) {
      input.value = String(value);
      if (valueLabel) {
        valueLabel.textContent = input.options[input.selectedIndex]?.textContent ?? input.value;
      }
    } else if (def.kind === "color" && input instanceof HTMLInputElement) {
      input.value = String(value);
      if (valueLabel) {
        valueLabel.textContent = input.value;
      }
    } else if (input instanceof HTMLInputElement) {
      input.value = String(value);
      if (valueLabel) {
        valueLabel.textContent = formatNumber(Number(value), def.step);
      }
    }
  }
}

function formatNumber(value: number, step = 0.01): string {
  if (step >= 1) {
    return String(Math.round(value));
  }
  const digits = Math.min(4, Math.max(0, String(step).split(".")[1]?.length ?? 2));
  return value.toFixed(digits);
}

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const node = document.createElement("button");
  node.type = "button";
  node.className = "dash__btn";
  node.textContent = label;
  node.addEventListener("click", () => onClick());
  return node;
}
