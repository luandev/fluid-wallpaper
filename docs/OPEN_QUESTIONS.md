# Open questions

Each question should be resolved through a research issue before it becomes an implementation constraint.

## Platform

- Which Wallpaper Engine APIs should handle properties, visibility, pause state, audio, and performance signals?
- What lifecycle behavior can be relied on across supported environments?

## GPU capabilities

- Which texture formats, filtering modes, and render-target features are consistently available on target hardware?
- What fallback behavior preserves a complete experience on limited devices?

## Quality budgets

- What internal resolution and iteration budgets define the initial quality levels?
- Which settings should reduce first under frame-time pressure?
- How should update rate and display frame rate be separated?

## Visual state

- How many independent pigment or material fields are useful before memory bandwidth dominates?
- Which derived fields best support depth and material response?

## Technology choices

- Which browser GPU API should be the first supported path?
- Which language and build workflow offer the smallest maintainable surface?
- Should an experimental newer-GPU path exist in the first release or remain deferred?

## Distribution

- What reproducible packaging process best maps source releases to Workshop releases?
- Which assets, licenses, and attribution records are required before publishing?
