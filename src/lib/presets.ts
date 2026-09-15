import type { StylePreset } from "./types";

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "israeli",
    he: "קולנוע ישראלי",
    en: "Israeli cinema",
    bible:
      "Contemporary Israeli cinema: Mediterranean hard sunlight, dusty stone, beige-linen wardrobe, handheld 35mm grain, naturalistic blocking, quiet faces, heat haze, Hebrew urban texture without readable signage.",
  },
  {
    id: "noir",
    he: "נואר לילי",
    en: "Night noir",
    bible:
      "Wet-asphalt noir: single practical lamps, deep blacks, cigarette smoke, rain streaks on glass, anamorphic flares, low-key chiaroscuro, 1940s-meets-now wardrobe, slow tracking through alleys.",
  },
  {
    id: "anderson",
    he: "סימטריה פסטל",
    en: "Pastel symmetry",
    bible:
      "Wes-Anderson-adjacent tableau: perfectly centered symmetry, pastel production design, planimetric camera, dollhouse sets, deadpan faces, warm practicals, meticulously dressed props, 40mm look.",
  },
  {
    id: "anime",
    he: "אנימה קולנועי",
    en: "Cinematic anime",
    bible:
      "Makoto-Shinkai-adjacent cinematic anime: painterly skies, rim light on hair, detailed cloth, golden-hour lens bloom, still-then-move camera, emotional close-ups, no text in frame.",
  },
  {
    id: "docu",
    he: "דוקו-דרמה",
    en: "Docu-drama",
    bible:
      "Observational docu-drama: available light, imperfect framing, 16mm grain, muted earth palette, real rooms, lingering medium shots, diegetic sound implied, no glamour lighting.",
  },
  {
    id: "scifi",
    he: "מדע בדיוני קר",
    en: "Cold sci-fi",
    bible:
      "Cold science fiction: practical cockpit lights, brushed metal, fogged glass, teal-and-amber, anamorphic, scale via tiny figures, quiet dread, tactile analog interfaces, no logos.",
  },
  {
    id: "epic",
    he: "פנטזיה אפית",
    en: "Epic fantasy",
    bible:
      "Epic fantasy cinema: vast landscapes, dawn mist, weathered leather and linen, 65mm grandeur, volumetric god-rays, wind in fabric, ancient stone, faces lit like paintings.",
  },
  {
    id: "super8",
    he: "פילם ישן",
    en: "Vintage super-8",
    bible:
      "Vintage super-8 memory: light leaks, warm halation, soft focus, faded reds, handheld drift, backyard-myth scale, dust on the gate, intimate amateur framing that still feels composed.",
  },
];

export const VOICES = [
  { id: "eve", he: "איב — רכה", en: "Eve — soft" },
  { id: "leo", he: "ליאו — מספר", en: "Leo — narrator" },
  { id: "orion", he: "אוריון — עמוק", en: "Orion — deep" },
  { id: "luna", he: "לונה — חמה", en: "Luna — warm" },
  { id: "helix", he: "הליקס — דרמטי", en: "Helix — dramatic" },
  { id: "ara", he: "ארה — בהירה", en: "Ara — bright" },
] as const;

export const IDEA_CHIPS = [
  {
    he: "ילדה מוצאת דלת בארון שנפתחת לרחוב בתל אביב, 1984.",
    en: "A child finds a wardrobe door that opens onto a Tel Aviv street in 1984.",
  },
  {
    he: "אסטרונאוט ננעל מחוץ לתחנה. כדור הארץ משתקף על הקסדה.",
    en: "An astronaut is locked outside the station. Earth reflects on the visor.",
  },
  {
    he: "בלש בירושלים בלילה גשום. נורה אחת מעל סמטה, ואז מישהו רץ.",
    en: "A detective in rainy Jerusalem. One lamp over an alley, then someone runs.",
  },
  {
    he: "סבתא אופה עוגה בלילה. בכל קילוף קליפה הזמן זז שנה אחורה.",
    en: "A grandmother bakes at night. Each peel of citrus rewinds a year.",
  },
];
