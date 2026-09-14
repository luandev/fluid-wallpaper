import { defaultLiquidScene } from "./liquidScene";
import { createGl } from "../sim/gpu";
import { LiquidSolver } from "../sim/liquidSolver";
import { LiquidDisplay } from "../render/liquidDisplay";

const canvas = document.getElementById("fixture") as HTMLCanvasElement;
const output = document.getElementById("result")!;
let cancelled = false,
  running = false;
document.getElementById("stop")!.onclick = () => {
  cancelled = true;
};
async function run(mode: "transport" | "static" | "resize") {
  if (running) return;
  running = true;
  cancelled = false;
  let solver: LiquidSolver | undefined, display: LiquidDisplay | undefined;
  let gl: WebGL2RenderingContext | undefined,
    vao: WebGLVertexArrayObject | null = null,
    buffer: WebGLBuffer | null = null;
  try {
    gl = createGl(canvas);
    vao = gl.createVertexArray();
    buffer = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const n = Number(
      (document.getElementById("grid") as HTMLSelectElement).value,
    );
    const scene = defaultLiquidScene();
    solver = new LiquidSolver(gl, scene, n, n);
    display = new LiquidDisplay(gl);
    const before = solver.diagnostics(),
      start = performance.now();
    const duration = mode === "transport" ? 60 : mode === "static" ? 1 : 0;
    let time = 0;
    if (mode === "resize") {
      const next = solver.resize(Math.floor(n * 0.75), n * 2);
      solver.dispose();
      solver = next;
    }
    while (time < duration - 1e-9 && !cancelled) {
      // Yield once per batch so cancellation and UI can be handled; never run a 60 s synchronous loop.
      const end = Math.min(duration, time + 0.1);
      while (time < end - 1e-9) {
        if (mode === "transport") {
          const amplitude = 0.004 * Math.cos((Math.PI * time) / 60);
          solver.setDiagnosticFlow(
            (x, y) =>
              amplitude *
              Math.sin(Math.PI * x) ** 2 *
              Math.sin(Math.PI * y) ** 2,
          );
        }
        const dt = Math.min(solver.stableDt, end - time);
        if (mode === "transport") solver.transport(dt);
        else solver.step(dt);
        time += dt;
      }
      display.draw(
        solver.phaseRead,
        solver.pigmentRead,
        scene,
        canvas.width,
        canvas.height,
        true,
      );
      output.textContent = `${mode}: ${time.toFixed(1)} / ${duration} simulated seconds`;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
    }
    const after = solver.diagnostics();
    const drift = Math.abs(after.phaseMean / before.phaseMean - 1);
    output.textContent = JSON.stringify(
      {
        mode,
        cancelled,
        userAgent: navigator.userAgent,
        grid: n,
        elapsedMs: performance.now() - start,
        phaseMassRelativeDrift: drift,
        boundedWithinFloatTolerance:
          after.phaseMin >= -1e-5 && after.phaseMax <= 1 + 1e-5,
        phaseMassUnderOnePercent: drift < 0.01,
        pigmentNonnegativeWithinFloatTolerance: after.pigmentMin >= -1e-6,
        before,
        after,
        limitations:
          "No pressure-jump, viscous convergence, translation, lifecycle or device acceptance asserted by this fixture.",
      },
      null,
      2,
    );
  } catch (error) {
    output.textContent = String(error);
  } finally {
    solver?.dispose();
    display?.dispose();
    if (gl) {
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
    }
    running = false;
  }
}
for (const mode of ["transport", "static", "resize"] as const)
  document.getElementById(mode)!.onclick = () => {
    void run(mode);
  };
