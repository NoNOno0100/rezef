export type Lang = "he" | "en";
export type Aspect = "16:9" | "9:16" | "1:1";
export type Transition = "cut" | "fade" | "dissolve";
export type ShotStatus =
  | "script"
  | "start"
  | "end"
  | "video"
  | "voice"
  | "ready"
  | "error";

export type Character = {
  name: string;
  look: string;
  portraitKey?: string;
};

export type Shot = {
  id: string;
  heading: string;
  action: string;
  dialogue: string;
  narration: string;
  durationSec: 6 | 10;
  shotType: string;
  camera: string;
  startPrompt: string;
  endPrompt: string;
  motionPrompt: string;
  startImageKey?: string;
  endImageKey?: string;
  videoUrl?: string;
  videoKey?: string;
  audioKey?: string;
  status: ShotStatus;
  error?: string;
  transitionIn: Transition;
};

export type Film = {
  id: string;
  title: string;
  logline: string;
  idea: string;
  visualBible: string;
  styleId: string;
  styleLabel: string;
  lang: Lang;
  aspect: Aspect;
  voiceId: string;
  sceneCount: number;
  characters: Character[];
  shots: Shot[];
  createdAt: number;
  updatedAt: number;
  producing?: boolean;
  produceLabel?: string;
};

export type StylePreset = {
  id: string;
  he: string;
  en: string;
  bible: string;
};
