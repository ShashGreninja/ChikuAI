import { clock } from "./format";
import type { Activity, AgeGroup, Day, IntakeResult, Place } from "./types";

/** Everything Chiku asks, in order. `name` is null when the parent skips it. */
export interface Answers {
  place?: Place;
  name?: string | null;
  age?: AgeGroup;
  asthma?: boolean;
  activity?: Activity;
  minutes?: number;
  day?: Day;
  usual?: number;
}

export type StepId = keyof Answers;
export const STEPS: StepId[] = ["place", "name", "age", "asthma", "activity", "minutes", "day", "usual"];

export const ACTIVITY_META: Record<Activity, { label: string; emoji: string; sub: string }> = {
  play: { label: "Park play", emoji: "🛝", sub: "running around" },
  cycling: { label: "Cycling", emoji: "🚲", sub: "steady effort" },
  sports: { label: "Sports", emoji: "🏏", sub: "cricket, football" },
  walk: { label: "A walk", emoji: "🚶", sub: "easy pace" },
};

export const AGE_LABEL: Record<AgeGroup, string> = { "3-5": "3 to 5", "6-10": "6 to 10", "11-15": "11 to 15" };

export function nextStep(a: Answers): StepId | null {
  return STEPS.find((s) => a[s] === undefined) ?? null;
}

export function isComplete(a: Answers): a is Required<Answers> {
  return nextStep(a) === null;
}

export function childWord(a: Answers): string {
  return a.name || "your child";
}

/** Short chip text for an answered step, for the editable trail. */
export function trailLabel(step: StepId, a: Answers): string | null {
  switch (step) {
    case "place":
      return a.place ? `📍 ${a.place.name}` : null;
    case "name":
      return a.name === undefined ? null : a.name ? `🧒 ${a.name}` : "🧒 no name";
    case "age":
      return a.age ? `${AGE_LABEL[a.age]} yrs` : null;
    case "asthma":
      return a.asthma === undefined ? null : a.asthma ? "🫁 asthma" : "no asthma";
    case "activity":
      return a.activity ? `${ACTIVITY_META[a.activity].emoji} ${ACTIVITY_META[a.activity].label}` : null;
    case "minutes":
      return a.minutes ? `${a.minutes} min` : null;
    case "day":
      return a.day ? (a.day === "today" ? "today" : "tomorrow") : null;
    case "usual":
      return a.usual !== undefined ? `usually ${clock(a.usual)}` : null;
  }
}

/** Merge what the LLM understood from free text into the answers. */
export function mergeIntake(a: Answers, r: IntakeResult): Answers {
  const out = { ...a };
  if (r.place_match) out.place = r.place_match;
  if (r.child_name) out.name = r.child_name;
  if (r.age_group) out.age = r.age_group;
  if (r.asthma !== null) out.asthma = r.asthma;
  if (r.activity) out.activity = r.activity;
  if (r.minutes) out.minutes = [30, 60, 90, 120].reduce((b, m) => (Math.abs(m - r.minutes!) < Math.abs(b - r.minutes!) ? m : b), 60);
  if (r.day) out.day = r.day;
  if (r.usual_time) {
    const [h, m] = r.usual_time.split(":").map(Number);
    if (!Number.isNaN(h)) out.usual = Math.min(19 * 60, Math.max(6 * 60, Math.round((h * 60 + (m || 0)) / 30) * 30));
  }
  return out;
}
