export const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export const DEFAULT_YOUTUBE_URL =
  "https://www.youtube.com/watch?v=hKckckhpbYY";
export const DEFAULT_YOUTUBE_ID = "hKckckhpbYY";

function validId(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const id = value.split("?")[0]?.split("&")[0]?.trim() ?? "";
  return YOUTUBE_ID_RE.test(id) ? id : undefined;
}

function hostAllowed(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "youtu.be" ||
    host === "youtube.com" ||
    host === "www.youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "www.youtube-nocookie.com" ||
    host === "youtube-nocookie.com"
  );
}

/** Extract an 11-character video id. Rejects non-YouTube URLs. */
export function parseYouTubeId(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const direct = validId(trimmed);
  if (direct) {
    return direct;
  }
  try {
    const url = new URL(trimmed);
    if (!hostAllowed(url.hostname)) {
      return undefined;
    }
    if (url.hostname.toLowerCase() === "youtu.be") {
      return validId(url.pathname.split("/").filter(Boolean)[0]);
    }
    const queryId = validId(url.searchParams.get("v") ?? undefined);
    if (queryId) {
      return queryId;
    }
    const parts = url.pathname.split("/").filter(Boolean);
    const marker = parts.findIndex(
      (part) =>
        part === "embed" ||
        part === "shorts" ||
        part === "live" ||
        part === "v",
    );
    if (marker >= 0) {
      return validId(parts[marker + 1]);
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function sanitizeYoutubeUrl(value: unknown): string {
  const id = parseYouTubeId(value);
  return id ? `https://www.youtube.com/watch?v=${id}` : "";
}

export function youtubeEmbedSrc(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}`;
}
