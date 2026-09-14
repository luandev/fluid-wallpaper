import {
  defineFluidHero,
  type FluidHeroElement,
} from "../../package-dist/hero.js";
import {
  fluidPresets,
  getFluidPreset,
  getFluidPresetDocument,
} from "../../package-dist/presets.js";
import type { FluidConfig } from "../app/config";
import { reference } from "./reference";
import { PAGE_HEROES, TRANSPARENT_HERO } from "./heroes";

const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const page = document.body.dataset.page ?? "";
const menu = document.querySelector<HTMLButtonElement>(".menu-toggle")!,
  nav = $("docs-nav");
menu.onclick = () => {
  const open = menu.getAttribute("aria-expanded") !== "true";
  menu.setAttribute("aria-expanded", String(open));
  nav.dataset.open = String(open);
};
for (const link of nav.querySelectorAll("a"))
  if (new URL(link.href).pathname === location.pathname)
    link.setAttribute("aria-current", "page");

const heroes = Array.from(
  document.querySelectorAll("fluid-hero"),
) as FluidHeroElement[];
heroes.forEach((hero) => hero.setAttribute("paused", ""));
defineFluidHero();

const pageHero = document.getElementById("page-hero") as FluidHeroElement | null;
if (pageHero && PAGE_HEROES[page]) {
  pageHero.removeAttribute("preset");
  pageHero.toggleAttribute("glass", true);
  pageHero.config = PAGE_HEROES[page]!;
}

let previewPaused = false;
const visible = new Set<FluidHeroElement>();
function coordinate() {
  const candidates = heroes.filter((h) => visible.has(h));
  const active =
    candidates.find((h) => h.id === "gallery-preview") ??
    candidates.find((h) => h.id !== "page-hero") ??
    candidates[0];
  for (const hero of heroes) {
    if (hero === active && !(hero.id === "gallery-preview" && previewPaused))
      hero.removeAttribute("paused");
    else hero.pause();
  }
}
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target as FluidHeroElement);
      else visible.delete(entry.target as FluidHeroElement);
    }
    coordinate();
  },
  { threshold: 0.15 },
);
heroes.forEach((h) => observer.observe(h));
window.addEventListener("pagehide", () => observer.disconnect(), { once: true });

if (page === "hero") {
  const example = $("transparent-example") as FluidHeroElement | null;
  if (example) {
    example.removeAttribute("preset");
    example.config = TRANSPARENT_HERO;
  }
  $("underlay-action").onclick = () => {
    $("underlay-status").textContent = " Click received through the fluid.";
  };
}

if (page === "settings") {
  const groups = [...new Set(reference.map((r) => r.group))];
  for (const group of groups) {
    const id = "group-" + group.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      section = document.createElement("section");
    section.id = id;
    const heading = document.createElement("h2");
    heading.textContent = group;
    section.append(heading);
    const link = document.createElement("a");
    link.href = "#" + id;
    link.textContent = group;
    $("reference-nav").append(link);
    for (const row of reference.filter((r) => r.group === group)) {
      const article = document.createElement("article");
      article.className = "reference-entry";
      article.id = row.path;
      article.dataset.search =
        `${row.path} ${row.group} ${row.help} ${row.limits}`.toLowerCase();
      const h = document.createElement("h3"),
        a = document.createElement("a");
      a.href = "#" + row.path;
      a.textContent = row.path;
      h.append(a);
      const p = document.createElement("p");
      p.textContent = row.help;
      const limits = document.createElement("p");
      limits.className = "limits";
      limits.textContent = `${Array.isArray(row.value) ? "array" : typeof row.value} · ${row.limits}${row.reseed ? " · Recreates the composition/resources" : ""}`;
      const pre = document.createElement("pre");
      pre.textContent = "Default: " + JSON.stringify(row.value, null, 2);
      article.append(h, p, limits, pre);
      section.append(article);
    }
    $("reference").append(section);
  }
  const search = $<HTMLInputElement>("setting-search");
  const filter = () => {
    let count = 0;
    const terms = search.value.toLowerCase().trim().split(/\s+/);
    for (const row of document.querySelectorAll<HTMLElement>(".reference-entry")) {
      row.hidden = !terms.every((term) => row.dataset.search!.includes(term));
      if (!row.hidden) count++;
    }
    for (const section of $("reference").querySelectorAll("section"))
      section.hidden = !section.querySelector(".reference-entry:not([hidden])");
    $("result-count").textContent = `${count} settings and fields`;
  };
  search.oninput = filter;
  filter();
  if (location.hash)
    document
      .getElementById(decodeURIComponent(location.hash.slice(1)))
      ?.scrollIntoView();
}

if (page === "gallery") {
  const previews = import.meta.glob("../../presets/*/preview.png", {
    eager: true,
    query: "?url",
    import: "default",
  }) as Record<string, string>;
  const params = new URLSearchParams(location.search);
  let selected = fluidPresets.some((p) => p.id === params.get("preset"))
    ? params.get("preset")!
    : "aurora";
  const background = $<HTMLSelectElement>("background-mode");
  if (
    ["solid", "gradient", "transparent"].includes(params.get("background") ?? "")
  )
    background.value = params.get("background")!;
  const preview = $<FluidHeroElement>("gallery-preview");
  let current: FluidConfig;

  const applySelection = (config: FluidConfig) => {
    preview.removeAttribute("preset");
    preview.config = config;
    if (pageHero) {
      pageHero.removeAttribute("preset");
      pageHero.config = { ...config, pointerEnabled: false };
    }
  };

  const update = () => {
    const info = fluidPresets.find((p) => p.id === selected)!;
    const override =
      background.value === "preset"
        ? {}
        : {
            backgroundMode: background.value as FluidConfig["backgroundMode"],
          };
    current = { ...getFluidPreset(selected), ...override };
    applySelection(current);
    $("preset-title").textContent = info.name;
    $("preset-description").textContent = info.description;
    document.body.style.setProperty("--accent", info.accent);
    const query = new URLSearchParams({ preset: selected });
    if (background.value !== "preset") query.set("background", background.value);
    history.replaceState(null, "", "?" + query);
    $<HTMLAnchorElement>("open-tuner").href = "../play.html?" + query;
    $("html-example").textContent = `<fluid-hero id="art"><h1>Your headline</h1></fluid-hero>
<script type="module">
import { defineFluidHero } from 'fluid-wallpaper/hero';
import { getFluidPreset } from 'fluid-wallpaper/presets';
defineFluidHero();
const art = document.querySelector('#art');
art.config = { ...getFluidPreset('${selected}')${
      background.value !== "preset"
        ? `, backgroundMode: '${background.value}'`
        : ""
    } };
</script>`;
    $("react-example").textContent = `import { FluidHero } from 'fluid-wallpaper/react';
import { getFluidPreset } from 'fluid-wallpaper/presets';

const look = { ...getFluidPreset('${selected}')${
      background.value !== "preset"
        ? `, backgroundMode: '${background.value}' as const`
        : ""
    } };

<FluidHero config={look}>
  <h1>Your headline</h1>
</FluidHero>

// Or start from a preset attribute and patch:
// <FluidHero preset="${selected}" config={{ noiseTime: 0.06 }} />`;
    for (const card of document.querySelectorAll<HTMLElement>(".preset-card"))
      card.setAttribute("aria-current", String(card.dataset.preset === selected));
    previewPaused = false;
    $("preview-toggle").textContent = "Pause preview";
    coordinate();
  };

  for (const info of fluidPresets) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "preset-card";
    card.dataset.preset = info.id;
    card.setAttribute("aria-label", "Load " + info.name + " in the hero");
    const image = document.createElement("img");
    image.src = previews[`../../presets/${info.id}/preview.png`] ?? "";
    image.alt = "";
    image.loading = "lazy";
    image.width = 640;
    image.height = 400;
    image.draggable = false;
    const body = document.createElement("div");
    body.className = "preset-card__body";
    const h = document.createElement("h3");
    h.textContent = info.name;
    const character = document.createElement("p");
    character.className = "preset-card__character";
    character.textContent = info.character;
    const p = document.createElement("p");
    p.textContent = info.description;
    const swatches = document.createElement("div");
    swatches.className = "swatches";
    swatches.setAttribute("aria-hidden", "true");
    for (const material of getFluidPreset(info.id).materials) {
      const span = document.createElement("span");
      span.style.background = material.color;
      swatches.append(span);
    }
    body.append(h, character, p, swatches);
    card.append(image, body);
    card.onclick = () => {
      selected = info.id;
      update();
      $("gallery-detail").scrollIntoView({ behavior: "smooth", block: "start" });
      preview.play();
    };
    $("gallery-grid").append(card);
  }

  background.onchange = update;
  $("preview-toggle").onclick = () => {
    previewPaused = !previewPaused;
    $("preview-toggle").textContent = previewPaused
      ? "Play preview"
      : "Pause preview";
    if (!previewPaused) preview.play();
    coordinate();
  };
  $("download-preset").onclick = () => {
    const doc = getFluidPresetDocument(selected);
    doc.presets[0].config = current;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = selected + ".json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  for (const kind of ["html", "react"])
    $("copy-" + kind).onclick = () => {
      void navigator.clipboard
        .writeText($(kind + "-example").textContent!)
        .then(() => {
          $("copy-status").textContent =
            "Copied " + kind.toUpperCase() + " example.";
        })
        .catch(() => {
          $("copy-status").textContent =
            "Clipboard unavailable. Select and copy the example below.";
        });
    };
  update();
}
