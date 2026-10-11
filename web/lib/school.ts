import { clock, prettyDate } from "./format";
import type { AgeGroup, Place, SchoolDay, StatusKey } from "./types";

export type Kind = "pe" | "sports" | "assembly" | "recess" | "walk";

export interface SchoolClass {
  id: string;
  name: string;
  age: AgeGroup;
  asthma: number;
}

/** One row of the weekly timetable. days: 1 = Monday … 6 = Saturday. */
export interface TimetableEntry {
  id: string;
  days: number[];
  class_id: string; // a class id, or "all"
  kind: Kind;
  start: number;
  minutes: number;
}

export interface SchoolSetup {
  name: string;
  place: Place | null;
  start: number;
  end: number;
  classes: SchoolClass[];
  timetable: TimetableEntry[];
  /** Set once the school has named itself and picked a location. */
  ready: boolean;
}

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const KIND_LABEL: Record<Kind, string> = {
  pe: "PE / games",
  sports: "Sports practice",
  assembly: "Assembly",
  recess: "Recess",
  walk: "Nature walk",
};

const KIND_HI: Record<Kind, string> = {
  pe: "पीटी / खेल",
  sports: "खेल अभ्यास",
  assembly: "प्रार्थना सभा",
  recess: "रिसेस",
  walk: "प्रकृति सैर",
};

/** Hindi for the server's activity ladder (same order: go, caution, limit, stop). */
const LADDER_HI: Record<Kind, string[]> = {
  pe: ["मैदान में पूरे खेल", "मैदान में हल्की ड्रिल, हर 15 मिनट पानी", "हॉल में योग या इनडोर खेल", "कक्षा में स्ट्रेचिंग और थ्योरी"],
  sports: ["अभ्यास तय समय पर", "सिर्फ़ स्किल अभ्यास, मैच नहीं, ज़्यादा पानी", "हॉल में इनडोर फ़िटनेस", "बाहर का अभ्यास रद्द"],
  assembly: ["सभा बाहर, हमेशा की तरह", "बाहर छोटी सभा, 10 मिनट", "हॉल में सभा", "कक्षाओं में पीए से सभा"],
  recess: ["बाहर रिसेस", "बाहर छाँव में रिसेस", "गलियारों और हॉल में रिसेस", "कक्षाओं में रिसेस"],
  walk: ["सैर तय समय पर", "छाँव वाले रास्ते पर छोटी सैर", "अंदर की गतिविधि", "अंदर की गतिविधि"],
};

const LEVEL: Record<StatusKey, number> = { go: 0, caution: 1, limit: 2, stop: 3 };

let seq = 0;
export function newId(prefix: string) {
  seq += 1;
  return `${prefix}${Date.now().toString(36)}${seq}`;
}

/** A realistic starting point so the plan works on first open. */
export function sampleSetup(): SchoolSetup {
  return {
    name: "",
    place: null,
    start: 8 * 60,
    end: 14 * 60,
    ready: false,
    classes: [
      { id: "ukg", name: "UKG", age: "3-5", asthma: 0 },
      { id: "3a", name: "3A", age: "6-10", asthma: 1 },
      { id: "5b", name: "5B", age: "6-10", asthma: 3 },
      { id: "8a", name: "8A", age: "11-15", asthma: 2 },
    ],
    timetable: [
      { id: "t1", days: [1, 2, 3, 4, 5, 6], class_id: "all", kind: "assembly", start: 8 * 60, minutes: 20 },
      { id: "t2", days: [1, 2, 3, 4, 5, 6], class_id: "all", kind: "recess", start: 11 * 60, minutes: 30 },
      { id: "t3", days: [1, 2, 3, 4, 5, 6], class_id: "ukg", kind: "pe", start: 10 * 60, minutes: 30 },
      { id: "t4", days: [1, 3, 5], class_id: "3a", kind: "pe", start: 9 * 60, minutes: 40 },
      { id: "t5", days: [1, 3, 5], class_id: "5b", kind: "pe", start: 12 * 60, minutes: 40 },
      { id: "t6", days: [2, 4, 6], class_id: "8a", kind: "pe", start: 12 * 60 + 40, minutes: 40 },
      { id: "t7", days: [2, 4], class_id: "8a", kind: "sports", start: 13 * 60 + 20, minutes: 40 },
    ],
  };
}

const KEY = "bk.school.v2";

export function loadSetup(): SchoolSetup | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SchoolSetup) : null;
  } catch {
    return null;
  }
}

export function saveSetup(s: SchoolSetup) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

/** 1 = Monday … 7 = Sunday, for "today" or "tomorrow" in the browser's local time. */
export function weekday(day: "today" | "tomorrow"): number {
  const d = new Date();
  if (day === "tomorrow") d.setDate(d.getDate() + 1);
  return ((d.getDay() + 6) % 7) + 1;
}

/** The periods that happen on a given weekday, in the shape the API expects. */
export function periodsFor(s: SchoolSetup, wd: number) {
  return s.timetable
    .filter((t) => t.days.includes(wd))
    .map((t) => ({ id: t.id, class_id: t.class_id, kind: t.kind, start: t.start, minutes: t.minutes }));
}

// ---------------------------------------------------------------- CSV import

const DAY_WORDS: Record<string, number[]> = {
  mon: [1], tue: [2], wed: [3], thu: [4], fri: [5], sat: [6],
  daily: [1, 2, 3, 4, 5, 6], all: [1, 2, 3, 4, 5, 6], "mon-fri": [1, 2, 3, 4, 5], "mon-sat": [1, 2, 3, 4, 5, 6],
};
const KIND_WORDS: Record<string, Kind> = {
  pe: "pe", pt: "pe", games: "pe", sports: "sports", practice: "sports", assembly: "assembly", prayer: "assembly",
  recess: "recess", break: "recess", lunch: "recess", walk: "walk",
};

export interface ImportResult {
  classes: SchoolClass[];
  timetable: TimetableEntry[];
  errors: string[];
}

/**
 * Parse rows like "Mon/Wed/Fri, 5B, PE, 12:00, 40" or "Daily, All, Assembly, 08:00, 20".
 * Columns: days, class, activity, start time, minutes. Tabs (pasted from Excel) work too.
 */
export function parseTimetable(text: string, existing: SchoolClass[]): ImportResult {
  const classes = [...existing];
  const timetable: TimetableEntry[] = [];
  const errors: string[] = [];
  text.split(/\r?\n/).forEach((line, i) => {
    const cells = line.split(/\t|,/).map((c) => c.trim()).filter(Boolean);
    if (!cells.length || /^day/i.test(cells[0])) return;
    if (cells.length < 5) {
      errors.push(`Line ${i + 1}: needs 5 columns`);
      return;
    }
    const [dayText, cls, act, time, mins] = cells;
    const days = [...new Set(dayText.toLowerCase().split(/[/ &+]+/).flatMap((w) => DAY_WORDS[w] ?? []))].sort();
    const kind = KIND_WORDS[act.toLowerCase().split(/\s+/)[0]];
    const [h, m] = time.replace(".", ":").split(":").map(Number);
    const minutes = Number(mins);
    if (!days.length || !kind || Number.isNaN(h) || !minutes) {
      errors.push(`Line ${i + 1}: couldn't read "${line.trim()}"`);
      return;
    }
    let class_id = "all";
    if (!/^(all|whole|school)/i.test(cls)) {
      let c = classes.find((x) => x.name.toLowerCase() === cls.toLowerCase());
      if (!c) {
        c = { id: newId("c"), name: cls.toUpperCase(), age: "6-10", asthma: 0 };
        classes.push(c);
      }
      class_id = c.id;
    }
    timetable.push({ id: newId("t"), days, class_id, kind, start: h * 60 + (m || 0), minutes });
  });
  return { classes, timetable, errors };
}

// ---------------------------------------------------------------- staff message

export function staffMessage(day: SchoolDay, school: string, lang: "en" | "hi"): string {
  const date = prettyDate(day.date);
  const lines = day.periods.map((p) => {
    const action = lang === "hi" ? LADDER_HI[p.kind as Kind][LEVEL[p.status.key]] : p.action;
    const kind = lang === "hi" ? KIND_HI[p.kind as Kind] : p.kind_label;
    const who = p.class_id === "all" ? (lang === "hi" ? "पूरा स्कूल" : "Whole school") : p.class_name;
    let line = `• ${clock(p.start)} ${kind}, ${who}: ${action}`;
    if (p.asthma) {
      line += lang === "hi" ? ` (अस्थमा वाले ${p.asthma.count} बच्चे: इनहेलर साथ रखें)` : ` (${p.asthma.count} with asthma: keep inhalers handy)`;
    }
    return line;
  });
  const swaps = day.swaps.map((s) =>
    lang === "hi"
      ? `• ${s.a.class_name} और ${s.b.class_name} पीटी का समय आपस में बदलें (${s.a.from} ⇄ ${s.b.from})`
      : `• Swap PE: ${s.a.class_name} (${s.a.from}) with ${s.b.class_name} (${s.b.from})`,
  );
  const a = day.day_aqi;
  if (lang === "hi") {
    return [
      `🐦 बाहर खेलो | ${school} | ${date}`,
      day.advisory ? "सरकारी एडवाइज़री लागू है: आज सभी गतिविधियाँ अंदर।" : `हवा: AQI ${a.peak} तक।`,
      ...lines,
      ...(swaps.length ? ["सुझाए गए बदलाव:", ...swaps] : []),
    ].join("\n");
  }
  return [
    `🐦 Bahar Khelo | ${school} | ${date}`,
    day.advisory ? "Government advisory in force: all outdoor activity indoors today." : `Air: AQI up to ${a.peak} (${a.peak_cat}, mostly ${a.dominant}).`,
    ...lines,
    ...(swaps.length ? ["Suggested swaps:", ...swaps] : []),
  ].join("\n");
}
