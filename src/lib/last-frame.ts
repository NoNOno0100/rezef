export function captureLastFrame(video: HTMLVideoElement): string | null {
  try {
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.92);
  } catch {
    return null;
  }
}

export async function grabLastFrameFromUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    const fail = () => resolve(null);
    video.onerror = fail;
    video.onloadedmetadata = () => {
      const t = Math.max(0, (video.duration || 0) - 0.08);
      const onSeek = () => {
        video.removeEventListener("seeked", onSeek);
        resolve(captureLastFrame(video));
      };
      video.addEventListener("seeked", onSeek);
      try {
        video.currentTime = t;
      } catch {
        fail();
      }
    };
    video.src = url;
  });
}
