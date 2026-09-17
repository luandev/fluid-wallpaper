# Wallpaper host templates

## Purpose

Minimal Wallpaper Engine and Lively metadata plus `INSTALL.txt` and preview stills copied into the desktop zip by `scripts/pack-wallpaper.mjs` ([DEC-019](../docs/DECISIONS.md#dec-019---multi-host-html-wallpaper-pack)).

## Key files

- `project.json` — WE web wallpaper (`file: wallpaper.html`, empty properties)
- `LivelyInfo.json` — Lively metadata
- `preview.png` / `lively_*.png` — pack thumbnails (tracked copies of authored preset art)
- `INSTALL.txt` — offline install steps shipped inside the zip

Do not add Workshop ids, `general.properties` UI, or `LivelyProperties.json` here without a new decision. Runtime boot lives in `src/wallpaper/`.
