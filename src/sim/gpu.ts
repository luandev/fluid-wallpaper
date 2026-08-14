import type { SimFormat } from "./capabilities";

export type FBO = {
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
  width: number;
  height: number;
};

export type DoubleFBO = {
  read: FBO;
  write: FBO;
  swap: () => void;
};

export function createGl(canvas: HTMLCanvasElement): WebGL2RenderingContext {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: "high-performance",
  });
  if (!gl) {
    throw new Error("WebGL2 is not available in this browser.");
  }
  return gl;
}

export function compileProgram(
  gl: WebGL2RenderingContext,
  vertSrc: string,
  fragSrc: string,
  label: string,
): WebGLProgram {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc, `${label} vertex`);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc, `${label} fragment`);
  const program = gl.createProgram();
  if (!program) {
    throw new Error(`Failed to create program: ${label}`);
  }
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.bindAttribLocation(program, 0, "aPosition");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "unknown link error";
    gl.deleteProgram(program);
    throw new Error(`${label} link failed: ${log}`);
  }
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  return program;
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
  label: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error(`Failed to create shader: ${label}`);
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "unknown compile error";
    gl.deleteShader(shader);
    throw new Error(`${label} compile failed: ${log}`);
  }
  return shader;
}

export function uniformMap(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
): Record<string, WebGLUniformLocation> {
  const map: Record<string, WebGLUniformLocation> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < count; i += 1) {
    const info = gl.getActiveUniform(program, i);
    if (!info) {
      continue;
    }
    const location = gl.getUniformLocation(program, info.name);
    if (location) {
      map[info.name] = location;
    }
  }
  return map;
}

export function createFullscreenVao(gl: WebGL2RenderingContext): WebGLVertexArrayObject {
  const vao = gl.createVertexArray();
  const buffer = gl.createBuffer();
  if (!vao || !buffer) {
    throw new Error("Failed to create fullscreen geometry");
  }
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  return vao;
}

export function createFbo(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  format: SimFormat,
): FBO {
  const texture = gl.createTexture();
  const framebuffer = gl.createFramebuffer();
  if (!texture || !framebuffer) {
    throw new Error("Failed to allocate framebuffer");
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, format.filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, format.filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    format.internalFormat,
    width,
    height,
    0,
    format.format,
    format.type,
    null,
  );
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    gl.deleteTexture(texture);
    gl.deleteFramebuffer(framebuffer);
    throw new Error(`Incomplete framebuffer (${status}) for ${width}x${height}`);
  }
  return { texture, framebuffer, width, height };
}

export function createDoubleFbo(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  format: SimFormat,
): DoubleFBO {
  const a = createFbo(gl, width, height, format);
  const b = createFbo(gl, width, height, format);
  const pair: DoubleFBO = {
    read: a,
    write: b,
    swap: () => {
      const tmp = pair.read;
      pair.read = pair.write;
      pair.write = tmp;
    },
  };
  return pair;
}

export function deleteFbo(gl: WebGL2RenderingContext, fbo: FBO): void {
  gl.deleteTexture(fbo.texture);
  gl.deleteFramebuffer(fbo.framebuffer);
}

export function deleteDoubleFbo(gl: WebGL2RenderingContext, fbo: DoubleFBO): void {
  deleteFbo(gl, fbo.read);
  deleteFbo(gl, fbo.write);
}

export function bindTarget(
  gl: WebGL2RenderingContext,
  target: FBO | null,
  fallbackWidth: number,
  fallbackHeight: number,
): void {
  if (target) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.viewport(0, 0, target.width, target.height);
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, fallbackWidth, fallbackHeight);
  }
}

export function resolutionFor(resolution: number, aspect: number): { width: number; height: number } {
  if (aspect > 1) {
    return {
      width: Math.max(8, Math.round(resolution * aspect)),
      height: Math.max(8, resolution),
    };
  }
  return {
    width: Math.max(8, resolution),
    height: Math.max(8, Math.round(resolution / Math.max(aspect, 1e-4))),
  };
}
