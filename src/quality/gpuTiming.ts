interface TimerExtension {
  TIME_ELAPSED_EXT: number;
  GPU_DISJOINT_EXT: number;
}
export interface LiquidTiming {
  solverMs: number;
  rendererMs: number;
  source: "gpu" | "cpu-submission-proxy";
}

/** Nonblocking timer queries. Disjoint periods invalidate the entire pending batch. */
export class GpuTiming {
  private extension: TimerExtension | null;
  private pending: { query: WebGLQuery; label: "solverMs" | "rendererMs" }[] =
    [];
  value: LiquidTiming = {
    solverMs: 0,
    rendererMs: 0,
    source: "cpu-submission-proxy",
  };
  constructor(private gl: WebGL2RenderingContext) {
    this.extension = gl.getExtension(
      "EXT_disjoint_timer_query_webgl2",
    ) as TimerExtension | null;
  }
  measure(label: "solverMs" | "rendererMs", run: () => void): void {
    const ext = this.extension,
      gl = this.gl;
    const query = ext && this.pending.length < 12 ? gl.createQuery() : null;
    const start = performance.now();
    if (query && ext) gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
    try {
      run();
    } finally {
      if (query && ext) {
        gl.endQuery(ext.TIME_ELAPSED_EXT);
        this.pending.push({ query, label });
      }
      if (this.value.source !== "gpu")
        this.value[label] = performance.now() - start;
    }
  }
  poll(): void {
    const gl = this.gl,
      ext = this.extension;
    if (!ext) return;
    if (gl.getParameter(ext.GPU_DISJOINT_EXT)) {
      this.pending.forEach((p) => gl.deleteQuery(p.query));
      this.pending = [];
      this.value = {
        solverMs: 0,
        rendererMs: 0,
        source: "cpu-submission-proxy",
      };
      return;
    }
    this.pending = this.pending.filter((p) => {
      if (!gl.getQueryParameter(p.query, gl.QUERY_RESULT_AVAILABLE))
        return true;
      this.value[p.label] =
        Number(gl.getQueryParameter(p.query, gl.QUERY_RESULT)) / 1e6;
      this.value.source = "gpu";
      gl.deleteQuery(p.query);
      return false;
    });
  }
  dispose(): void {
    this.pending.forEach((p) => this.gl.deleteQuery(p.query));
    this.pending = [];
  }
}
