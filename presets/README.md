# Community preset collection

Each lowercase-slug folder contains `preset.json` (one full fluid-wallpaper.preset.v1 preset), `metadata.json`, and a representative `preview.png` at 640x400. The preset id/name match metadata and folder. Metadata records name, description, character, accent (#RRGGBB), public author, MIT license, and tags. Stable material/driver IDs must resolve; external music/audio/camera/tilt dependencies are not accepted.

JSON is shared by the gallery, heroes, landing and package lookup. Authored hero looks use a lower simulation grid, slower motion, and a close crop (`viewZoom` ≈ 2.1–2.25) so page heroes read as large, calm detail rather than a busy full field. PNGs are intentionally retained source artwork for the gallery and excluded from the npm runtime. The six initial previews were captured from Chrome / ANGLE SwiftShader using the actual Engine at ECO, 24 warmup steps, 640x400; they are visual examples, not performance certification.

Follow [the public guide](../docs/contributing-presets.html). Yarn tests validate files and configs; build includes new folders automatically.
