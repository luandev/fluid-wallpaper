export const GL = {
  RGBA: 0x1908,
  RGBA16F: 0x881a,
  RGBA32F: 0x8814,
  HALF_FLOAT: 0x140b,
  FLOAT: 0x1406,
  LINEAR: 0x2601,
  NEAREST: 0x2600,
} as const;

export type GpuCaps = {
  webgl2: boolean;
  colorBufferFloat: boolean;
  colorBufferHalfFloat: boolean;
  textureFloatLinear: boolean;
  textureHalfFloatLinear: boolean;
};

export type SimFormat = {
  internalFormat: number;
  format: number;
  type: number;
  filter: number;
  precision: "half" | "float";
  manualBilinear: boolean;
};

export type FormatSelection =
  | { ok: true; format: SimFormat }
  | { ok: false; reason: string };

export function detectCaps(gl: WebGL2RenderingContext): GpuCaps {
  return {
    webgl2: true,
    colorBufferFloat: gl.getExtension("EXT_color_buffer_float") !== null,
    colorBufferHalfFloat: gl.getExtension("EXT_color_buffer_half_float") !== null,
    textureFloatLinear: gl.getExtension("OES_texture_float_linear") !== null,
    textureHalfFloatLinear: gl.getExtension("OES_texture_half_float_linear") !== null,
  };
}

export function selectSimTextureFormat(caps: GpuCaps): FormatSelection {
  if (!caps.webgl2) {
    return { ok: false, reason: "WebGL2 is required." };
  }

  const halfRenderable = caps.colorBufferFloat || caps.colorBufferHalfFloat;
  if (halfRenderable) {
    return {
      ok: true,
      format: {
        internalFormat: GL.RGBA16F,
        format: GL.RGBA,
        type: GL.HALF_FLOAT,
        filter: caps.textureHalfFloatLinear ? GL.LINEAR : GL.NEAREST,
        precision: "half",
        manualBilinear: !caps.textureHalfFloatLinear,
      },
    };
  }

  if (caps.colorBufferFloat) {
    return {
      ok: true,
      format: {
        internalFormat: GL.RGBA32F,
        format: GL.RGBA,
        type: GL.FLOAT,
        filter: caps.textureFloatLinear ? GL.LINEAR : GL.NEAREST,
        precision: "float",
        manualBilinear: !caps.textureFloatLinear,
      },
    };
  }

  return {
    ok: false,
    reason:
      "This GPU cannot render to floating-point textures (need EXT_color_buffer_float or EXT_color_buffer_half_float).",
  };
}

export function describeFormat(format: SimFormat): string {
  return `${format.precision === "half" ? "RGBA16F" : "RGBA32F"} ${
    format.filter === GL.LINEAR ? "linear" : "nearest"
  }`;
}
