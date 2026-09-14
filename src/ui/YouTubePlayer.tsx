import type { ReactNode } from "react";
import { parseYouTubeId, youtubeEmbedSrc } from "../inputs/youtubeId";
import "./youtubePlayer.css";

export function YouTubePlayer({ url }: { url: string }): ReactNode {
  const id = parseYouTubeId(url);
  if (!id) {
    return null;
  }
  return (
    <aside className="yt-player">
      <p className="yt-player__label">Music</p>
      <iframe
        className="yt-player__frame"
        title="YouTube music"
        src={`${youtubeEmbedSrc(id)}?rel=0&modestbranding=1`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </aside>
  );
}
