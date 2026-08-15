import type { Engine } from "./engine";
import {
  cloneConfig,
  controlSchema,
  defaultConfig,
  sanitizeConfig,
  type ControlDef,
  type ControlGroup,
  type FluidConfig,
} from "./config";
import {
  deletePreset,
  loadPresets,
  upsertPreset,
  type FluidPreset,
} from "./presets";

const STORAGE_KEY = "fluid-wallpaper.config.v7";
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
  root.classList.add("dash");
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
      onChange(def.key, input.value, false);
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
  node.addEventListener("click", onClick);
  return node;
}
