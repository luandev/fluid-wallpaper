# Community preset collection

Each lowercase-slug folder contains `preset.json` (one full fluid-wallpaper.preset.v1 preset), `metadata.json`, and a representative `preview.png` at 640x400. The preset id/name match metadata and folder. Metadata records name, description, character, accent (#RRGGBB), public author, MIT license, and tags. Stable material/driver IDs must resolve; external music/audio/camera/tilt dependencies are not accepted.

JSON is shared by the gallery, package lookup and optional consumer starts. Docs page heroes use hand-authored calm presentation separately. Landing showcase scenes remain independently authored and keep fuller simulation settings. Gallery presets are intentionally distinct in palette, substrate, motion and emitter layout. Authored docs-hero looks keep a modest simulation grid (`simResolution` 192), slow time speed (`noiseTime` ≈ 0.05–0.06), and a close crop (`viewZoom` ≈ 2.0–2.4). PNGs are intentionally retained source artwork for the gallery and excluded from the npm runtime. The six initial previews were captured from Chrome / ANGLE SwiftShader using the actual Engine at ECO, 24 warmup steps, 640x400; they are visual examples, not performance certification.

Follow [the public guide](../docs/contributing-presets.html). Yarn tests validate files and configs; build includes new folders automatically.
