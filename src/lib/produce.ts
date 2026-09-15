import {
  generateStill,
  pollVideo,
  speak,
  startExtend,
  startVideo,
  writeNextShot,
  writeScript,
} from "./ai";
import { grabLastFrameFromUrl } from "./last-frame";
import { peekMedia, resolveMedia } from "./media-db";
import { useStudio } from "./store";
import type { Film, Shot } from "./types";
import { sleep, uid } from "./utils";

function filmOf(id: string): Film | undefined {
  return useStudio.getState().films.find((f) => f.id === id);
}

function shotOf(film: Film, shotId: string): Shot | undefined {
  return film.shots.find((s) => s.id === shotId);
}

function biblePrompt(film: Film, extra: string) {
  const looks = film.characters.map((c) => `${c.name}: ${c.look}`).join(" | ");
  return [
    extra,
    `Visual lock: ${film.visualBible}`,
    looks ? `Characters: ${looks}` : "",
    "Photoreal cinematic still, film grain, no text, no watermark, no logos, no UI.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function portraits(film: Film): Promise<string[]> {
  const urls: string[] = [];
  for (const c of film.characters) {
    if (!c.portraitKey) continue;
    const u = (await resolveMedia(c.portraitKey)) ?? peekMedia(c.portraitKey);
    if (u) urls.push(u);
  }
  return urls;
}

async function waitVideo(requestId: string): Promise<string> {
  const deadline = Date.now() + 8 * 60 * 1000;
  while (Date.now() < deadline) {
    const r = await pollVideo({ data: { requestId } });
    if (!r.ok) throw new Error(r.error);
    if (r.status === "done" && r.url) return r.url;
    await sleep(4000);
  }
  throw new Error("video timed out");
}

export async function produceScript(filmId: string) {
  const st = useStudio.getState();
  const film = filmOf(filmId);
  if (!film) return;
  st.setProducing(filmId, true, film.lang === "he" ? "כותב תסריט…" : "Writing script…");
  try {
    const r = await writeScript({
      data: {
        idea: film.idea,
        styleId: film.styleId,
        lang: film.lang,
        aspect: film.aspect,
        sceneCount: film.sceneCount,
      },
    });
    if (!r.ok) throw new Error(r.error);
    st.applyScript(filmId, r.script);
  } finally {
    st.setProducing(filmId, false);
  }
}

export async function produceLookbook(filmId: string) {
  const st = useStudio.getState();
  const film = filmOf(filmId);
  if (!film) return;
  st.setProducing(filmId, true, film.lang === "he" ? "מצייר דמויות…" : "Drawing characters…");
  try {
    const next = [...film.characters];
    for (let i = 0; i < next.length; i++) {
      const c = next[i];
      if (c.portraitKey) continue;
      const r = await generateStill({
        data: {
          aspect: "1:1",
          prompt: biblePrompt(
            film,
            `Cinematic character portrait of ${c.name}. ${c.look}. Neutral dark studio, 50mm, shallow depth of field, 3/4 view, same person who will appear in every scene.`,
          ),
        },
      });
      if (!r.ok) throw new Error(r.error);
      const key = uid("port");
      await st.saveAsset(key, r.dataUrl);
      next[i] = { ...c, portraitKey: key };
      st.patchFilm(filmId, { characters: next });
    }
  } finally {
    st.setProducing(filmId, false);
  }
}

export async function produceStill(
  filmId: string,
  shotId: string,
  which: "start" | "end",
) {
  const st = useStudio.getState();
  const film = filmOf(filmId);
  if (!film) return;
  const shot = shotOf(film, shotId);
  if (!shot) return;
  const idx = film.shots.findIndex((s) => s.id === shotId);
  const prev = idx > 0 ? film.shots[idx - 1] : undefined;

  if (which === "start" && prev?.endImageKey && !shot.startImageKey) {
    st.patchShot(filmId, shotId, { startImageKey: prev.endImageKey, status: "start" });
    return;
  }

  st.setProducing(filmId, true, film.lang === "he" ? "מצייר פריים…" : "Drawing frame…");
  st.patchShot(filmId, shotId, { status: which === "start" ? "start" : "end", error: undefined });
  try {
    const refs = await portraits(film);
    const inherit =
      which === "end"
        ? await resolveMedia(shot.startImageKey)
        : prev
          ? await resolveMedia(prev.endImageKey)
          : undefined;
    const prompt =
      which === "start"
        ? biblePrompt(film, shot.startPrompt)
        : biblePrompt(
            film,
            `${shot.endPrompt}. Continue the previous still a few seconds later. Same faces, wardrobe, lighting, location.`,
          );
    const r = await generateStill({
      data: {
        aspect: film.aspect,
        prompt,
        referenceDataUrls: [inherit, ...refs].filter((x): x is string => Boolean(x)).slice(0, 3),
      },
    });
    if (!r.ok) throw new Error(r.error);
    const key = uid(which);
    await st.saveAsset(key, r.dataUrl);
    if (which === "start") {
      st.patchShot(filmId, shotId, { startImageKey: key, status: "start" });
    } else {
      st.patchShot(filmId, shotId, { endImageKey: key, status: "end" });
    }
  } catch (e) {
    st.patchShot(filmId, shotId, {
      status: "error",
      error: e instanceof Error ? e.message : "still failed",
    });
    throw e;
  } finally {
    st.setProducing(filmId, false);
  }
}

export async function produceVideo(filmId: string, shotId: string) {
  const st = useStudio.getState();
  let film = filmOf(filmId);
  if (!film) return;
  let shot = shotOf(film, shotId);
  if (!shot) return;

  if (!shot.startImageKey) await produceStill(filmId, shotId, "start");
  film = filmOf(filmId)!;
  shot = shotOf(film, shotId)!;
  if (!shot.endImageKey) await produceStill(filmId, shotId, "end");
  film = filmOf(filmId)!;
  shot = shotOf(film, shotId)!;

  const start = await resolveMedia(shot.startImageKey);
  const end = await resolveMedia(shot.endImageKey);
  if (!start) throw new Error("missing start frame");

  st.setProducing(filmId, true, film.lang === "he" ? "מנפיש שוט…" : "Animating shot…");
  st.patchShot(filmId, shotId, { status: "video", error: undefined });
  try {
    const refs = await portraits(film);
    const started = await startVideo({
      data: {
        prompt: `${shot.motionPrompt}. Stay faithful to the first frame. End on the last frame. Cinematic, ${film.visualBible}`,
        aspect: film.aspect,
        duration: shot.durationSec,
        startDataUrl: start,
        endDataUrl: end,
        referenceDataUrls: refs,
      },
    });
    if (!started.ok) throw new Error(started.error);
    const url = await waitVideo(started.requestId);
    st.patchShot(filmId, shotId, { videoUrl: url, status: "video" });

    const captured = await grabLastFrameFromUrl(url);
    if (captured) {
      const key = uid("end");
      await st.saveAsset(key, captured);
      st.patchShot(filmId, shotId, { endImageKey: key });
    }
  } catch (e) {
    st.patchShot(filmId, shotId, {
      status: "error",
      error: e instanceof Error ? e.message : "video failed",
    });
    throw e;
  } finally {
    st.setProducing(filmId, false);
  }
}

export async function produceVoice(filmId: string, shotId: string) {
  const st = useStudio.getState();
  const film = filmOf(filmId);
  if (!film) return;
  const shot = shotOf(film, shotId);
  if (!shot?.narration?.trim()) {
    st.patchShot(filmId, shotId, { status: shot?.videoUrl || shot?.endImageKey ? "ready" : shot?.status });
    return;
  }
  st.setProducing(filmId, true, film.lang === "he" ? "מקליט קריינות…" : "Recording VO…");
  st.patchShot(filmId, shotId, { status: "voice", error: undefined });
  try {
    const r = await speak({
      data: { text: shot.narration, voiceId: film.voiceId, lang: film.lang },
    });
    if (!r.ok) throw new Error(r.error);
    const key = uid("vo");
    await st.saveAsset(key, r.dataUrl);
    st.patchShot(filmId, shotId, { audioKey: key, status: "ready" });
  } catch (e) {
    st.patchShot(filmId, shotId, {
      status: "error",
      error: e instanceof Error ? e.message : "voice failed",
    });
    throw e;
  } finally {
    st.setProducing(filmId, false);
  }
}

export async function produceShot(filmId: string, shotId: string) {
  await produceVideo(filmId, shotId);
  await produceVoice(filmId, shotId);
}

export async function produceFilm(filmId: string) {
  const film = filmOf(filmId);
  if (!film) return;
  if (!film.shots.length) await produceScript(filmId);
  const after = filmOf(filmId);
  if (!after) return;
  if (after.characters.some((c) => !c.portraitKey)) {
    try {
      await produceLookbook(filmId);
    } catch {
      /* portraits are optional */
    }
  }
  const latest = filmOf(filmId);
  if (!latest) return;
  for (const shot of latest.shots) {
    const live = shotOf(filmOf(filmId)!, shot.id);
    if (live?.status === "ready" && live.videoUrl) continue;
    await produceShot(filmId, shot.id);
  }
}

export async function continueFilm(filmId: string) {
  const st = useStudio.getState();
  const film = filmOf(filmId);
  if (!film || !film.shots.length) return;
  const last = film.shots[film.shots.length - 1];
  st.setProducing(filmId, true, film.lang === "he" ? "כותב שוט המשך…" : "Writing continuation…");
  try {
    const r = await writeNextShot({
      data: {
        lang: film.lang,
        visualBible: film.visualBible,
        title: film.title,
        idea: film.idea,
        lastHeading: last.heading,
        lastAction: last.action,
        lastEndPrompt: last.endPrompt,
        characters: film.characters,
      },
    });
    if (!r.ok) throw new Error(r.error);
    const shotId = st.appendShot(filmId, r.shot, { startImageKey: last.endImageKey });
    st.setProducing(filmId, false);
    await produceShot(filmId, shotId);
  } catch (e) {
    st.setProducing(filmId, false);
    throw e;
  }
}

export async function extendLastClip(filmId: string) {
  const st = useStudio.getState();
  const film = filmOf(filmId);
  if (!film) return;
  const last = [...film.shots].reverse().find((s) => s.videoUrl);
  if (!last?.videoUrl) throw new Error("no clip to extend");
  st.setProducing(filmId, true, film.lang === "he" ? "מאריך קליפ…" : "Extending clip…");
  try {
    const started = await startExtend({
      data: {
        prompt: `${last.motionPrompt}. Continue seamlessly from the last frame.`,
        duration: 6,
        videoUrl: last.videoUrl,
      },
    });
    if (!started.ok) throw new Error(started.error);
    const url = await waitVideo(started.requestId);
    st.patchShot(filmId, last.id, { videoUrl: url, durationSec: 10 });
    const captured = await grabLastFrameFromUrl(url);
    if (captured) {
      const key = uid("end");
      await st.saveAsset(key, captured);
      st.patchShot(filmId, last.id, { endImageKey: key });
    }
  } finally {
    st.setProducing(filmId, false);
  }
}

export async function recaptureEnd(filmId: string, shotId: string) {
  const st = useStudio.getState();
  const film = filmOf(filmId);
  const shot = film ? shotOf(film, shotId) : undefined;
  if (!shot?.videoUrl) return;
  const captured = await grabLastFrameFromUrl(shot.videoUrl);
  if (!captured) throw new Error("could not grab frame");
  const key = uid("end");
  await st.saveAsset(key, captured);
  st.patchShot(filmId, shotId, { endImageKey: key });
}
