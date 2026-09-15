import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STYLE_PRESETS } from "./presets";
import { delMany, saveMedia } from "./media-db";
import type { Aspect, Film, Lang, Shot, Transition } from "./types";
import { uid } from "./utils";

type NewFilmInput = {
  idea: string;
  styleId: string;
  lang: Lang;
  aspect: Aspect;
  voiceId: string;
  sceneCount: number;
};

type StudioState = {
  lang: Lang;
  films: Film[];
  activeId: string | null;
  selectedShotId: string | null;
  aiOn: boolean | null;
  setLang: (lang: Lang) => void;
  setAiOn: (on: boolean) => void;
  setActive: (id: string | null) => void;
  selectShot: (id: string | null) => void;
  createDraft: (input: NewFilmInput) => string;
  applyScript: (
    filmId: string,
    script: {
      title: string;
      logline: string;
      visualBible: string;
      characters: Film["characters"];
      shots: Omit<Shot, "id" | "status" | "transitionIn" | "error">[];
    },
  ) => void;
  appendShot: (
    filmId: string,
    shot: Omit<Shot, "id" | "status" | "transitionIn" | "error">,
    opts?: { startImageKey?: string },
  ) => string;
  patchFilm: (filmId: string, patch: Partial<Film>) => void;
  patchShot: (filmId: string, shotId: string, patch: Partial<Shot>) => void;
  setTransition: (filmId: string, shotId: string, t: Transition) => void;
  setProducing: (filmId: string, producing: boolean, label?: string) => void;
  saveAsset: (key: string, dataUrl: string) => Promise<string>;
  deleteFilm: (filmId: string) => Promise<void>;
};

function touch(film: Film): Film {
  return { ...film, updatedAt: Date.now() };
}

export const useStudio = create<StudioState>()(
  persist(
    (set, get) => ({
      lang: "he",
      films: [],
      activeId: null,
      selectedShotId: null,
      aiOn: null,
      setLang: (lang) => set({ lang }),
      setAiOn: (on) => set({ aiOn: on }),
      setActive: (id) =>
        set({
          activeId: id,
          selectedShotId: id
            ? (get().films.find((f) => f.id === id)?.shots[0]?.id ?? null)
            : null,
        }),
      selectShot: (id) => set({ selectedShotId: id }),
      createDraft: (input) => {
        const preset = STYLE_PRESETS.find((s) => s.id === input.styleId);
        const film: Film = {
          id: uid("film"),
          title: input.lang === "he" ? "בלי שם" : "Untitled",
          logline: "",
          idea: input.idea.trim(),
          visualBible: preset?.bible ?? "",
          styleId: input.styleId,
          styleLabel: input.lang === "he" ? (preset?.he ?? "") : (preset?.en ?? ""),
          lang: input.lang,
          aspect: input.aspect,
          voiceId: input.voiceId,
          sceneCount: input.sceneCount,
          characters: [],
          shots: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((s) => ({ films: [film, ...s.films], activeId: film.id, selectedShotId: null }));
        return film.id;
      },
      applyScript: (filmId, script) => {
        const shots: Shot[] = script.shots.map((s, i) => ({
          ...s,
          durationSec: 6,
          id: uid("shot"),
          status: "script",
          transitionIn: i === 0 ? "fade" : "cut",
        }));
        set((st) => ({
          films: st.films.map((f) =>
            f.id === filmId
              ? touch({
                  ...f,
                  title: script.title || f.title,
                  logline: script.logline,
                  visualBible: script.visualBible || f.visualBible,
                  characters: script.characters ?? [],
                  shots,
                })
              : f,
          ),
          selectedShotId: shots[0]?.id ?? null,
        }));
      },
      appendShot: (filmId, shot, opts) => {
        const id = uid("shot");
        set((st) => ({
          films: st.films.map((f) => {
            if (f.id !== filmId) return f;
            const next: Shot = {
              ...shot,
              durationSec: 6,
              id,
              status: opts?.startImageKey ? "start" : "script",
              transitionIn: f.shots.length ? "cut" : "fade",
              startImageKey: opts?.startImageKey,
            };
            return touch({ ...f, shots: [...f.shots, next] });
          }),
          selectedShotId: id,
        }));
        return id;
      },
      patchFilm: (filmId, patch) =>
        set((st) => ({
          films: st.films.map((f) => (f.id === filmId ? touch({ ...f, ...patch }) : f)),
        })),
      patchShot: (filmId, shotId, patch) =>
        set((st) => ({
          films: st.films.map((f) =>
            f.id === filmId
              ? touch({
                  ...f,
                  shots: f.shots.map((s) => (s.id === shotId ? { ...s, ...patch } : s)),
                })
              : f,
          ),
        })),
      setTransition: (filmId, shotId, t) =>
        get().patchShot(filmId, shotId, { transitionIn: t }),
      setProducing: (filmId, producing, label) =>
        set((st) => ({
          films: st.films.map((f) =>
            f.id === filmId ? { ...f, producing, produceLabel: label } : f,
          ),
        })),
      saveAsset: async (key, dataUrl) => {
        await saveMedia(key, dataUrl);
        return key;
      },
      deleteFilm: async (filmId) => {
        const film = get().films.find((f) => f.id === filmId);
        const keys: string[] = [];
        for (const c of film?.characters ?? []) if (c.portraitKey) keys.push(c.portraitKey);
        for (const s of film?.shots ?? []) {
          if (s.startImageKey) keys.push(s.startImageKey);
          if (s.endImageKey) keys.push(s.endImageKey);
          if (s.audioKey) keys.push(s.audioKey);
          if (s.videoKey) keys.push(s.videoKey);
        }
        if (keys.length) await delMany(keys);
        set((st) => ({
          films: st.films.filter((f) => f.id !== filmId),
          activeId: st.activeId === filmId ? null : st.activeId,
        }));
      },
    }),
    {
      name: "retzef-studio",
      partialize: (s) => ({
        lang: s.lang,
        films: s.films,
        activeId: s.activeId,
        selectedShotId: s.selectedShotId,
      }),
    },
  ),
);

export function activeFilm(): Film | undefined {
  const s = useStudio.getState();
  return s.films.find((f) => f.id === s.activeId);
}
