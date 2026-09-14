import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { parseYouTubeId, youtubeEmbedSrc } from "../inputs/youtubeId";
import "./youtubePlayer.css";

export function YouTubePlayer({ url, canvas, background }: { url: string; canvas: HTMLCanvasElement | null; background: boolean }): ReactNode {
  const id = parseYouTubeId(url);
  const [controls, setControls] = useState(false);
  useEffect(() => {
    if (!canvas || !background || !id) return;
    const position = canvas.style.position, zIndex = canvas.style.zIndex, pointerEvents = canvas.style.pointerEvents;
    canvas.style.position = "relative"; canvas.style.zIndex = "1";
    if (controls) canvas.style.pointerEvents = "none";
    return () => { canvas.style.position = position; canvas.style.zIndex = zIndex; canvas.style.pointerEvents = pointerEvents; };
  }, [canvas, background, id, controls]);
  if (!id) return null;
  const player = <aside className={background ? "yt-background" : "yt-player"} data-controls={controls} style={background && canvas?.parentElement === document.body ? {position:"fixed"} : undefined}>
    <iframe className="yt-player__frame" title="YouTube music" src={`${youtubeEmbedSrc(id)}?rel=0&playsinline=1`}
      allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
  </aside>;
  return <>
    {canvas?.parentElement ? createPortal(player, canvas.parentElement) : player}
    {background && <button className="yt-background__controls" aria-pressed={controls} onClick={() => setControls(value => !value)}>
      {controls ? "Return to fluid" : "Play / control music"}
    </button>}
  </>;
}
