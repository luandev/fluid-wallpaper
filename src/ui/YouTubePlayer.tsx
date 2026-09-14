import { useEffect, useState, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { parseYouTubeId, youtubeEmbedSrc } from "../inputs/youtubeId";
import "./youtubePlayer.css";
import { loadYouTubeApi, type YouTubeApiPlayer } from "../inputs/youtubeApi";

export function YouTubePlayer({
  url,
  canvas,
  background,
}: {
  url: string;
  canvas: HTMLCanvasElement | null;
  background: boolean;
}): ReactNode {
  const id = parseYouTubeId(url);
  const [controls, setControls] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audible, setAudible] = useState(false);
  const host = useRef<HTMLDivElement>(null),
    player = useRef<YouTubeApiPlayer | null>(null),
    backgroundRef = useRef(background);
  backgroundRef.current = background;
  useEffect(() => {
    if (!id || !host.current) return;
    const container = host.current,
      frame = document.createElement("iframe");
    let disposed = false;
    const params = new URLSearchParams({
      rel: "0",
      playsinline: "1",
      enablejsapi: "1",
      autoplay: backgroundRef.current ? "1" : "0",
      mute: "1",
      origin: location.origin,
    });
    frame.src = `${youtubeEmbedSrc(id)}?${params}`;
    frame.title = "YouTube music";
    frame.allow = "autoplay; encrypted-media; picture-in-picture";
    frame.allowFullscreen = true;
    container.replaceChildren(frame);
    setPlaying(false);
    setAudible(false);
    void loadYouTubeApi()
      .then((api) => {
        if (disposed) return;
        player.current = new api.Player(frame, {
          events: {
            onReady: () => {
              if (backgroundRef.current) {
                player.current?.mute();
                player.current?.playVideo();
              }
            },
            onStateChange: (event) => setPlaying(event.data === 1),
            onAutoplayBlocked: () => setPlaying(false),
            onError: () => setPlaying(false),
          },
        });
      })
      .catch(() => {
        if (!disposed) setPlaying(false);
      });
    return () => {
      disposed = true;
      player.current?.destroy();
      player.current = null;
      container.replaceChildren();
    };
  }, [id, canvas]);
  useEffect(() => {
    if (background) {
      player.current?.mute();
      player.current?.playVideo();
      setAudible(false);
    }
  }, [background]);
  useEffect(() => {
    if (!canvas || !background || !id) return;
    const position = canvas.style.position,
      zIndex = canvas.style.zIndex,
      pointerEvents = canvas.style.pointerEvents;
    canvas.style.position = "relative";
    canvas.style.zIndex = "1";
    if (controls) canvas.style.pointerEvents = "none";
    return () => {
      canvas.style.position = position;
      canvas.style.zIndex = zIndex;
      canvas.style.pointerEvents = pointerEvents;
    };
  }, [canvas, background, id, controls]);
  if (!id) return null;
  const playerView = (
    <aside
      className={background ? "yt-background" : "yt-player"}
      data-controls={controls}
      style={
        background && canvas?.parentElement === document.body
          ? { position: "fixed" }
          : undefined
      }
    >
      <div className="yt-player__frame" ref={host} />
    </aside>
  );
  return (
    <>
      {canvas?.parentElement
        ? createPortal(playerView, canvas.parentElement)
        : playerView}
      {background && (
        <div className="yt-background__actions">
          <button
            type="button"
            onClick={() => {
              setControls(true);
              player.current?.unMute();
              player.current?.playVideo();
              setAudible(true);
            }}
          >
            {!playing
              ? "Play video"
              : audible
                ? "Sound enabled"
                : "Enable sound"}
          </button>
        </div>
      )}
      {background && (
        <button
          className="yt-background__controls"
          aria-pressed={controls}
          onClick={() => setControls((value) => !value)}
        >
          {controls ? "Return to fluid" : "Play / control music"}
        </button>
      )}
    </>
  );
}
