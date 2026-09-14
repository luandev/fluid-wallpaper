# Adaptive ECO mode

ECO is an opt-in runtime policy for both the established field and experimental two-liquid scene. It reduces work when presentation falls behind and restores quality gradually when the host has headroom. It does not certify a particular frame rate or device.

## Enable and observe

```html
<fluid-ink quality="eco" style="height:320px"></fluid-ink>
```

The component demo exposes ECO in its Quality menu and displays effective grid size, target FPS, speed and change reason. The two-liquid studio exposes ECO in Quality policy and includes `simulationSpeed` in Quality status. Pointer interaction never boosts the liquid ECO policy above its frame limit.

For direct Engine or React integrations:

```ts
const engine = new Engine(canvas, config, {
  eco: true,
  onEcoChange: status => console.log(status),
});
engine.start();
engine.setEcoMode(false); // Restore authored resolution without a new composition.
```

```tsx
<FluidField onEngine={engine => engine.setEcoMode(true)} />
```

The constructor option applies the smaller budget before allocation/warmup. React's `onEngine` enables it after initial construction. `getEcoStatus()` and the element's `qualityStatus` expose effective settings; `qualitychange` fires on adaptation. For the legacy path, `qualityStatus` is now `EcoStatus | null`; for a liquid scene it remains `LiquidStatus`. `getConfig()` continues to return authored settings, not adaptive overrides. Leaving ECO restores those settings; choosing another named quality preset applies that preset as before.

## Policy

| ECO level | Legacy sim / pigment ceiling (short edge) | Target FPS | Simulation-time multiplier | Legacy display pixel cap |
| --- | --- | --- | --- | --- |
| 0 | 192 / 384 | 30 | 1.00 | 524,288 |
| 1 | 144 / 288 | 30 | 0.85 | 294,912 |
| 2 | 96 / 192 | 24 | 0.65 | 131,072 |
| 3 | 64 / 128 | 20 | 0.50 | 65,536 |

Authored resolutions below the initial ceilings stay below them, subject to internal floors of 64/128. Pressure stays at 20 iterations. ECO initialization caps existing warmup at 24 steps. The smaller internal grids do not change the authoring slider ranges. Display resolution changes preserve CSS size/aspect and pointer coordinates.

The experimental solver uses the same four scales, FPS and speed factors, starting at 16,384 cells and scaling cell area by scale squared (down to about 1,820 cells). Its display area is capped at 262,144 pixels initially and decreases with the shared policy; active-instance sharing can reduce it further. Existing stability limits, residual checks and substep caps remain in force.

The shared controller evaluates one-second windows. Two overloaded windows trigger one reduction; a minimum five-second cooldown separates changes. Recovery requires twelve comfortable windows and never exceeds the initial ECO budget. P90 submitted work above 70% of the frame interval, or more than 20% substantially late presentations, indicates overload. Comfortable work is below 40% with no sustained pacing problem. Ordinary refresh quantization is tolerated.

The established Engine measures CPU submission duration plus presentation cadence. It does not pretend CPU time is GPU time. The experimental runtime retains its existing asynchronous GPU queries with CPU-submission fallback. Hidden, paused and resized periods reset observation windows and timing debt so resume is not mistaken for sustained load. No blocking GPU readback is added to the legacy frame monitor.

## Continuity and limits

Legacy ECO performs at most one bounded solver step per presentation, with intentionally slowed simulation time, forces, color evolution and continuous injection. Missed frames do not trigger a catch-up burst. Actual progress can be slower than the reported multiplier if the host cannot meet the target or an authored timestep cap is smaller. Explicit pointer input remains responsive at the presentation cadence.

Adaptive legacy resizing bilinearly resamples all pigment channels and velocity on the GPU, scales velocity components for their new grid-cell units, then reprojects velocity. It does not reseed, warm up, reset elapsed time or touch saved configurations. Resampling can soften detail and is not a mass-conservation guarantee. Allocation is staged before releasing the old solver; failed allocation retains the current field and is reported through the change reason. Temporary old/new buffers coexist during transfer.

The experimental path retains its existing conservative CPU resize, which involves synchronous readbacks and can still be costly. ECO slows the wall-time supplied to its simulation clock and records intentionally skipped time in `slowdownSeconds`. It cannot interrupt a single expensive pressure/viscosity solve. Long-run visual continuity, thermal behavior and named-device performance remain validation work.

## Validation

CPU tests cover isolated spikes, sustained load, pacing-only overload, cooldown, floors, slow recovery, pause-history exclusion, unchanged authored configs, pixel caps, liquid policy selection and intentional slow-time accounting. The CI browser gate (`scripts/check-eco-browser.mjs`, Node 24 plus installed Chrome) runs after build on pull requests, Pages builds and releases. It controls rAF, forces overload without burning CPU, verifies all four GPU resizes and native-element lifecycle, checks background pixels and built tuner layer placement, and records three readback-synchronized frame samples per level. Reports are retained as CI artifacts; host-dependent timings are observations, not absolute FPS gates.

Measured 2026-09-14: Windows 10 user agent, headless Chrome 152, ANGLE Vulkan SwiftShader software GPU, 400 x 300 CSS canvas. Samples after each first frame were approximately 79/79 ms, 47/46 ms, 25/24 ms and 12/12 ms across levels 0-3. The first initial frame was 373 ms (includes first-use work). These bounded samples demonstrate less work at smaller grids; they do not establish mobile, hardware-GPU, thermal or long-session performance. The harness uses synchronous readbacks for measurements; production ECO does not.
