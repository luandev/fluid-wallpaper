import { describe, expect, it } from "vitest";
import {
  DEFAULT_YOUTUBE_ID,
  DEFAULT_YOUTUBE_URL,
  parseYouTubeId,
  sanitizeYoutubeUrl,
  youtubeEmbedSrc,
} from "../src/inputs/youtubeId";
import { sanitizeConfig, defaultConfig } from "../src/app/config";

describe("YouTube id parse", () => {
  it("accepts the default watch URL and a bare id", () => {
    expect(parseYouTubeId(DEFAULT_YOUTUBE_URL)).toBe(DEFAULT_YOUTUBE_ID);
    expect(parseYouTubeId(DEFAULT_YOUTUBE_ID)).toBe(DEFAULT_YOUTUBE_ID);
  });

  it("accepts youtu.be, shorts, and embed paths", () => {
    expect(parseYouTubeId(`https://youtu.be/${DEFAULT_YOUTUBE_ID}`)).toBe(
      DEFAULT_YOUTUBE_ID,
    );
    expect(
      parseYouTubeId(`https://www.youtube.com/shorts/${DEFAULT_YOUTUBE_ID}`),
    ).toBe(DEFAULT_YOUTUBE_ID);
    expect(
      parseYouTubeId(
        `https://www.youtube-nocookie.com/embed/${DEFAULT_YOUTUBE_ID}`,
      ),
    ).toBe(DEFAULT_YOUTUBE_ID);
  });

  it("rejects non-YouTube URLs", () => {
    expect(
      parseYouTubeId("https://example.com/watch?v=wKEeVPfK8nw"),
    ).toBeUndefined();
    expect(parseYouTubeId("not a url")).toBeUndefined();
    expect(sanitizeYoutubeUrl("https://vimeo.com/123")).toBe("");
  });

  it("canonicalizes stored URLs", () => {
    expect(
      sanitizeYoutubeUrl(`https://youtu.be/${DEFAULT_YOUTUBE_ID}?t=12`),
    ).toBe(DEFAULT_YOUTUBE_URL);
    expect(youtubeEmbedSrc(DEFAULT_YOUTUBE_ID)).toContain(DEFAULT_YOUTUBE_ID);
  });

  it("sanitizes config URLs and clamps videoReveal", () => {
    const next = sanitizeConfig({
      youtubeUrl: `https://youtu.be/${DEFAULT_YOUTUBE_ID}`,
      videoReveal: 4,
    });
    expect(next.youtubeUrl).toBe(DEFAULT_YOUTUBE_URL);
    expect(next.videoReveal).toBe(1);
    expect(
      sanitizeConfig({ youtubeUrl: "https://example.com/watch?v=nope" })
        .youtubeUrl,
    ).toBe("");
    expect(sanitizeConfig({ vorticity: 12 }).youtubeUrl).toBe("");
    expect(defaultConfig.youtubeUrl).toBe(DEFAULT_YOUTUBE_URL);
  });
});
