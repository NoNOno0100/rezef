import type { Lang } from "./types";

const dict = {
  app: { he: "רצף", en: "RETZEF" },
  tag: {
    he: "סטודיו קולנוע. כל שוט נולד מהפריים האחרון.",
    en: "A cinema studio. Every shot is born from the last frame.",
  },
  newFilm: { he: "סרט חדש", en: "New film" },
  films: { he: "הסרטים שלי", en: "My films" },
  empty: {
    he: "אין עדיין סרטים. כתבו רעיון, רצף יכתוב תסריט, יצייר פריימים, יחבר אותם לקליפים רציפים ויקריא.",
    en: "No films yet. Write an idea — RETZEF scripts it, draws frames, chains clips from the last frame, and narrates.",
  },
  idea: { he: "הרעיון לסרט", en: "The idea" },
  ideaPh: {
    he: "מה קורה, מי שם, איפה זה מרגיש. משפט או שניים מספיקים.",
    en: "What happens, who is there, how it feels. A sentence or two is enough.",
  },
  look: { he: "מראה", en: "Look" },
  ratio: { he: "פורמט", en: "Format" },
  scenes: { he: "שוטים", en: "Shots" },
  voice: { he: "קול קריינות", en: "Narration voice" },
  writeScript: { he: "כתוב תסריט", en: "Write script" },
  cancel: { he: "ביטול", en: "Cancel" },
  back: { he: "לספרייה", en: "Library" },
  playFilm: { he: "נגן סרט", en: "Play film" },
  stop: { he: "עצור", en: "Stop" },
  produce: { he: "הפק את הסרט", en: "Produce film" },
  nextShot: { he: "הפק שוט הבא", en: "Produce next shot" },
  stills: { he: "סטוריבורד", en: "Storyboard" },
  animate: { he: "הנפש שוט", en: "Animate shot" },
  narrate: { he: "קריינות", en: "Narrate" },
  extend: { he: "המשך מהסוף", en: "Continue from end" },
  recapture: { he: "תפוס פריים אחרון", en: "Grab last frame" },
  script: { he: "תסריט", en: "Script" },
  storyboard: { he: "לוח", en: "Board" },
  timeline: { he: "ציר זמן", en: "Timeline" },
  characters: { he: "דמויות", en: "Characters" },
  startFrame: { he: "פריים פתיחה", en: "Start frame" },
  endFrame: { he: "פריים סיום", en: "End frame" },
  lastFrame: { he: "פריים אחרון", en: "Last frame" },
  motion: { he: "תנועת מצלמה", en: "Camera move" },
  vo: { he: "קריין", en: "VO" },
  cut: { he: "חיתוך", en: "Cut" },
  fade: { he: "פייד", en: "Fade" },
  dissolve: { he: "דיזולב", en: "Dissolve" },
  delete: { he: "מחק סרט", en: "Delete film" },
  producing: { he: "מפיק…", en: "Producing…" },
  ready: { he: "מוכן", en: "Ready" },
  waiting: { he: "ממתין", en: "Waiting" },
  error: { he: "שגיאה", en: "Error" },
  aiOff: {
    he: "יצירת הבינה אינה זמינה כרגע. אפשר עדיין לעיין בממשק.",
    en: "AI generation is unavailable right now. You can still explore the studio.",
  },
  chainNote: {
    he: "השוט הבא נפתח מהפריים האחרון של הקליפ הקודם — אותה תמונה, אותו אור, אותה דמות.",
    en: "The next shot opens on the last frame of the previous clip — same image, light, and face.",
  },
  noShots: { he: "אין שוטים עדיין.", en: "No shots yet." },
  playShot: { he: "נגן שוט", en: "Play shot" },
  regenStill: { he: "צייר מחדש", en: "Redraw" },
  logline: { he: "לוגליין", en: "Logline" },
  bible: { he: "תנ״ך ויזואלי", en: "Visual bible" },
  extendHint: {
    he: "רצף יכתוב שוט חדש וימשיך בדיוק מהפריים האחרון.",
    en: "RETZEF will write a new shot and continue from the exact last frame.",
  },
  confirmProduce: {
    he: "הפקה מלאה מציירת פריימים, מנפישה קליפים ומקריאה. זה עולה קרדיטים. להמשיך?",
    en: "Full produce draws frames, animates clips, and narrates. This spends credits. Continue?",
  },
  seconds: { he: "שניות", en: "sec" },
  language: { he: "שפה", en: "Language" },
} as const;

export type CopyKey = keyof typeof dict;

export function t(lang: Lang, key: CopyKey): string {
  return dict[key][lang];
}
