import { createServerFn } from "@tanstack/react-start";
import { STYLE_PRESETS } from "./presets";
import type { Aspect, Character, Lang, Shot } from "./types";

const CHAT_MODEL = "grok-4.5";
const IMAGE_MODEL = "grok-imagine-image-2.0";
const VIDEO_MODEL = "grok-imagine-video-1.5";
const EXTEND_MODEL = "grok-imagine-video";

type Ok<T> = { ok: true } & T;
type Err = { ok: false; error: string };
export type Result<T> = Ok<T> | Err;

function key(): string | undefined {
  return process.env.XAI_API_KEY?.trim() || undefined;
}

async function xfetch(path: string, init?: RequestInit): Promise<Response> {
  const apiKey = key();
  if (!apiKey) throw new Error("missing-key");
  return fetch(`https://api.x.ai${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
}

async function toDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`media fetch ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1] ?? trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no-json");
  return JSON.parse(raw.slice(start, end + 1));
}

export const getAiStatus = createServerFn({ method: "GET" }).handler(async () => {
  return { available: Boolean(key()) };
});

type ScriptInput = {
  idea: string;
  styleId: string;
  lang: Lang;
  aspect: Aspect;
  sceneCount: number;
};

export type ScriptPayload = {
  title: string;
  logline: string;
  visualBible: string;
  characters: Character[];
  shots: Omit<Shot, "id" | "status" | "transitionIn" | "error">[];
};

export const writeScript = createServerFn({ method: "POST" })
  .validator((input: ScriptInput) => input)
  .handler(async ({ data }): Promise<Result<{ script: ScriptPayload }>> => {
    if (!key()) return { ok: false, error: "AI is not available" };
    const preset = STYLE_PRESETS.find((s) => s.id === data.styleId);
    const langName = data.lang === "he" ? "Hebrew" : "English";
    const n = Math.min(6, Math.max(3, data.sceneCount));
    const prompt = `You are a film director and cinematographer. Write a short film as JSON only.

User idea:
${data.idea}

Visual style lock (must appear in every image prompt):
${preset?.bible ?? "cinematic photoreal film still"}

Language for title, logline, headings, action, dialogue, narration: ${langName}.
Image/motion prompts stay in English so the image model understands them.
Aspect ratio: ${data.aspect}. Scene count: exactly ${n}.
Each shot duration is 6 seconds (integer 6).

Continuity rules:
- This film will be produced as chained clips. Shot N+1 MUST open on the exact last frame of shot N.
- startPrompt of shot 1 is the opening still.
- endPrompt of each shot is the composition the clip must land on.
- startPrompt of shot N+1 describes the SAME image as endPrompt of shot N (same blocking, wardrobe, lighting, location).
- Characters keep the same face, hair, clothes across all shots.
- No readable text, logos, watermarks, or UI in any frame.
- motionPrompt is 1-2 present-tense sentences: subject action + one camera move.

JSON shape:
{
  "title": string,
  "logline": string,
  "visualBible": string (one dense paragraph locking lens, palette, grain, lighting, era),
  "characters": [{ "name": string, "look": string (physical, wardrobe, age, distinguishing marks — for image prompts) }],
  "shots": [{
    "heading": string,
    "action": string,
    "dialogue": string (empty if none),
    "narration": string (voiceover, 1-3 sentences, spoken language),
    "durationSec": 6,
    "shotType": "wide" | "medium" | "close-up" | "tracking" | "insert" | "over-shoulder",
    "camera": string,
    "startPrompt": string (English, photoreal cinematic still, include visual bible cues, no text in frame),
    "endPrompt": string (English, a few seconds later, same people/place, new blocking),
    "motionPrompt": string (English, present tense)
  }]
}`;

    try {
      const res = await xfetch("/v1/chat/completions", {
        method: "POST",
        body: JSON.stringify({
          model: CHAT_MODEL,
          temperature: 0.7,
          max_tokens: 3500,
          messages: [
            {
              role: "system",
              content:
                "You write production-ready micro-screenplays as a single JSON object. No markdown, no preface.",
            },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (!res.ok) return { ok: false, error: `xAI API error ${res.status}` };
      const body = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = body.choices?.[0]?.message?.content ?? "";
      const parsed = parseJsonObject(text) as ScriptPayload;
      if (!parsed?.shots?.length) return { ok: false, error: "empty script" };
      parsed.shots = parsed.shots.slice(0, 6).map((s) => ({
        ...s,
        durationSec: 6,
        dialogue: s.dialogue ?? "",
        narration: s.narration ?? "",
      }));
      parsed.characters = (parsed.characters ?? []).slice(0, 3);
      return { ok: true, script: parsed };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "script failed" };
    }
  });

type NextShotInput = {
  lang: Lang;
  visualBible: string;
  title: string;
  idea: string;
  lastHeading: string;
  lastAction: string;
  lastEndPrompt: string;
  characters: Character[];
};

export const writeNextShot = createServerFn({ method: "POST" })
  .validator((input: NextShotInput) => input)
  .handler(async ({ data }): Promise<Result<{ shot: ScriptPayload["shots"][number] }>> => {
    if (!key()) return { ok: false, error: "AI is not available" };
    const langName = data.lang === "he" ? "Hebrew" : "English";
    const prompt = `Continue this short film with ONE next shot as JSON.
Title: ${data.title}
Idea: ${data.idea}
Visual bible: ${data.visualBible}
Characters: ${JSON.stringify(data.characters)}
Previous shot heading: ${data.lastHeading}
Previous action: ${data.lastAction}
Previous end frame (the next shot MUST open on this exact image): ${data.lastEndPrompt}

Language for heading/action/dialogue/narration: ${langName}.
Prompts in English. durationSec=6.
Return JSON: { heading, action, dialogue, narration, durationSec, shotType, camera, startPrompt, endPrompt, motionPrompt }
startPrompt must describe the previous end frame. endPrompt is a few seconds later.`;
    try {
      const res = await xfetch("/v1/chat/completions", {
        method: "POST",
        body: JSON.stringify({
          model: CHAT_MODEL,
          temperature: 0.7,
          max_tokens: 1200,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) return { ok: false, error: `xAI API error ${res.status}` };
      const body = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const shot = parseJsonObject(body.choices?.[0]?.message?.content ?? "") as ScriptPayload["shots"][number];
      shot.durationSec = 6;
      return { ok: true, shot };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "next shot failed" };
    }
  });

type ImageInput = {
  prompt: string;
  aspect: Aspect;
  referenceDataUrls?: string[];
};

function imageUrlFrom(body: unknown): string | undefined {
  const b = body as {
    data?: { url?: string; b64_json?: string }[];
    url?: string;
  };
  if (b.data?.[0]?.url) return b.data[0].url;
  if (b.url) return b.url;
  const b64 = b.data?.[0]?.b64_json;
  if (b64) return `data:image/jpeg;base64,${b64}`;
  return undefined;
}

export const generateStill = createServerFn({ method: "POST" })
  .validator((input: ImageInput) => input)
  .handler(async ({ data }): Promise<Result<{ dataUrl: string }>> => {
    if (!key()) return { ok: false, error: "AI is not available" };
    const refs = (data.referenceDataUrls ?? []).filter(Boolean).slice(0, 3);
    try {
      let res: Response;
      if (refs.length > 0) {
        const images = refs.map((url) => ({ url, type: "image_url" as const }));
        res = await xfetch("/v1/images/edits", {
          method: "POST",
          body: JSON.stringify({
            model: IMAGE_MODEL,
            prompt: data.prompt,
            image: images[0],
            ...(images.length > 1 ? { images } : {}),
            aspect_ratio: data.aspect,
            resolution: "1K",
          }),
        });
      } else {
        res = await xfetch("/v1/images/generations", {
          method: "POST",
          body: JSON.stringify({
            model: IMAGE_MODEL,
            prompt: data.prompt,
            n: 1,
            aspect_ratio: data.aspect,
            resolution: "1K",
          }),
        });
      }
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        return { ok: false, error: `image error ${res.status} ${errText.slice(0, 180)}` };
      }
      const body = await res.json();
      const url = imageUrlFrom(body);
      if (!url) return { ok: false, error: "no image in response" };
      const dataUrl = url.startsWith("data:") ? url : await toDataUrl(url);
      return { ok: true, dataUrl };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "image failed" };
    }
  });

type VideoStartInput = {
  prompt: string;
  aspect: Aspect;
  duration: 6 | 10;
  startDataUrl: string;
  endDataUrl?: string;
  referenceDataUrls?: string[];
};

export const startVideo = createServerFn({ method: "POST" })
  .validator((input: VideoStartInput) => input)
  .handler(async ({ data }): Promise<Result<{ requestId: string }>> => {
    if (!key()) return { ok: false, error: "AI is not available" };
    const body: Record<string, unknown> = {
      model: VIDEO_MODEL,
      prompt: data.prompt,
      duration: data.duration,
      aspect_ratio: data.aspect,
      resolution: "720p",
      generate_audio: true,
      image: { url: data.startDataUrl },
    };
    if (data.endDataUrl) body.last_frame = { url: data.endDataUrl };
    const refs = (data.referenceDataUrls ?? []).filter(Boolean).slice(0, 4);
    if (refs.length) body.reference_images = refs.map((url) => ({ url }));
    try {
      const res = await xfetch("/v1/videos/generations", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        return { ok: false, error: `video error ${res.status} ${errText.slice(0, 220)}` };
      }
      const json = (await res.json()) as { request_id?: string; id?: string };
      const requestId = json.request_id ?? json.id;
      if (!requestId) return { ok: false, error: "no request id" };
      return { ok: true, requestId };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "video start failed" };
    }
  });

type ExtendInput = { prompt: string; duration: 6 | 10; videoUrl: string };

export const startExtend = createServerFn({ method: "POST" })
  .validator((input: ExtendInput) => input)
  .handler(async ({ data }): Promise<Result<{ requestId: string }>> => {
    if (!key()) return { ok: false, error: "AI is not available" };
    try {
      const res = await xfetch("/v1/videos/extensions", {
        method: "POST",
        body: JSON.stringify({
          model: EXTEND_MODEL,
          prompt: data.prompt,
          duration: Math.min(10, Math.max(2, data.duration)),
          video: { url: data.videoUrl },
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        return { ok: false, error: `extend error ${res.status} ${errText.slice(0, 220)}` };
      }
      const json = (await res.json()) as { request_id?: string; id?: string };
      const requestId = json.request_id ?? json.id;
      if (!requestId) return { ok: false, error: "no request id" };
      return { ok: true, requestId };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "extend failed" };
    }
  });

export const pollVideo = createServerFn({ method: "POST" })
  .validator((input: { requestId: string }) => input)
  .handler(async ({ data }): Promise<Result<{ status: string; url?: string }>> => {
    if (!key()) return { ok: false, error: "AI is not available" };
    try {
      const res = await xfetch(`/v1/videos/${encodeURIComponent(data.requestId)}`);
      if (!res.ok) return { ok: false, error: `poll error ${res.status}` };
      const json = (await res.json()) as {
        status?: string;
        video?: { url?: string };
        url?: string;
        error?: { message?: string };
      };
      const status = json.status ?? "pending";
      if (status === "failed" || status === "expired") {
        return { ok: false, error: json.error?.message ?? status };
      }
      const url = json.video?.url ?? json.url;
      return { ok: true, status, url };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "poll failed" };
    }
  });

type TtsInput = { text: string; voiceId: string; lang: Lang };

export const speak = createServerFn({ method: "POST" })
  .validator((input: TtsInput) => input)
  .handler(async ({ data }): Promise<Result<{ dataUrl: string }>> => {
    if (!key()) return { ok: false, error: "AI is not available" };
    const text = data.text.slice(0, 800);
    if (!text.trim()) return { ok: false, error: "empty narration" };
    try {
      const res = await xfetch("/v1/tts", {
        method: "POST",
        body: JSON.stringify({
          text,
          voice_id: data.voiceId,
          language: data.lang,
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        return { ok: false, error: `voice error ${res.status} ${errText.slice(0, 180)}` };
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const mime = res.headers.get("content-type")?.split(";")[0] || "audio/mpeg";
      return { ok: true, dataUrl: `data:${mime};base64,${buf.toString("base64")}` };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "tts failed" };
    }
  });
