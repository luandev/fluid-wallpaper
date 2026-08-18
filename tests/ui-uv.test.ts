import { describe, expect, it } from "vitest";
import { clientToUv, uvToClient } from "../src/ui/spatial/uv";

const rect = { left: 10, top: 20, width: 200, height: 100 };

describe("clientToUv", () => {
  it("maps rect corners to 0/1 with V at the bottom", () => {
    expect(clientToUv(10, 20, rect)).toEqual({ u: 0, v: 1 });
    expect(clientToUv(210, 120, rect)).toEqual({ u: 1, v: 0 });
    expect(clientToUv(110, 70, rect)).toEqual({ u: 0.5, v: 0.5 });
  });

  it("clamps points outside the rect", () => {
    expect(clientToUv(-40, -10, rect)).toEqual({ u: 0, v: 1 });
    expect(clientToUv(400, 400, rect)).toEqual({ u: 1, v: 0 });
  });

  it("round-trips through uvToClient", () => {
    const uv = { u: 0.25, v: 0.75 };
    const client = uvToClient(uv, rect);
    expect(clientToUv(client.x, client.y, rect)).toEqual(uv);
  });
});
