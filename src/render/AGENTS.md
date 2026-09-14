# Display interpretation: agent context

Scope: `src/render/` and descendants. Read [root guidance](../../AGENTS.md), ancestor instructions, and [this folder's contract](README.md).

Read display.ts, display.frag.glsl, and app/shade.ts together. Do not write velocity or pressure from display. Current normalized RGB/surface shading is stylized; absorption, spectral mixing, and paper models remain proposals. State the color/alpha contract explicitly for appearance changes and distinguish CPU reference math from GPU image evidence.

For change recipes and known limitations, see [the engineering guide](../../docs/ENGINEERING_GUIDE.md). Follow root validation rules and update local context when a contract changes.

