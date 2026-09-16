/** Pinned npm preview for public docs/examples. Keep in sync with package.json `version`. */
export const PUBLISHED_VERSION = "0.1.0-next.0";

export const PUBLISHED_CDN =
  `https://cdn.jsdelivr.net/npm/fluid-wallpaper@${PUBLISHED_VERSION}` as const;

export const publishedModule = (entry: string) =>
  `${PUBLISHED_CDN}/${entry.replace(/^\//, "")}`;
