import { useEffect, useState } from "react";
import { peekMedia, resolveMedia } from "@/lib/media-db";

export function useMedia(key?: string) {
  const [url, setUrl] = useState<string | undefined>(() => peekMedia(key));
  useEffect(() => {
    if (!key) {
      setUrl(undefined);
      return;
    }
    const cached = peekMedia(key);
    if (cached) {
      setUrl(cached);
      return;
    }
    let live = true;
    void resolveMedia(key).then((u) => {
      if (live) setUrl(u);
    });
    return () => {
      live = false;
    };
  }, [key]);
  return url;
}
