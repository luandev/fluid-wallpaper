/** Optional official iframe API. Loaded only when a music player is mounted. */
export interface YouTubeApiPlayer {
  mute(): void;
  unMute(): void;
  playVideo(): void;
  destroy(): void;
}
interface YouTubeApi {
  Player: new (
    frame: HTMLIFrameElement,
    options: {
      events: {
        onReady: () => void;
        onStateChange: (event: { data: number }) => void;
        onAutoplayBlocked: () => void;
        onError: () => void;
      };
    },
  ) => YouTubeApiPlayer;
}
declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}
let loading: Promise<YouTubeApi> | undefined;
export function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const timer = window.setTimeout(() => {
      loading = undefined;
      reject(new Error("YouTube API unavailable"));
    }, 12000);
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      clearTimeout(timer);
      window.YT
        ? resolve(window.YT)
        : reject(new Error("YouTube API unavailable"));
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      clearTimeout(timer);
      loading = undefined;
      script.remove();
      reject(new Error("YouTube API unavailable"));
    };
    document.head.append(script);
  });
  return loading;
}
