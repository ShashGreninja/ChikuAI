export type StatusKey = "go" | "caution" | "limit" | "stop";
export type Day = "today" | "tomorrow";
export type AgeGroup = "3-5" | "6-10" | "11-15";
export type Activity = "play" | "cycling" | "sports" | "walk";
export type SchoolActivity = "pe" | "recess" | "assembly" | "sports" | "walk";
export type Confidence = "high" | "medium" | "low";

export interface Place {
  name: string;
  region: string;
  lat: number;
  lon: number;
}

export interface StatusInfo {
  key: StatusKey;
  label: string;
  hi: string;
}

export interface HourView {
  hour: number;
  aqi: number;
  aqi_cat: string;
  dominant: string;
  subindex: Record<string, number>;
  wf: number;
  pm25: number;
  temp: number;
  feels: number;
  rh: number;
  wbgt: number;
  uv: number;
  rain: number;
  vent_x: number;
  u: number;
  air_level: number;
  heat_level: number;
  level: number;
  status: StatusKey;
}

export interface WindowView {
  start: number;
  end: number;
  label: string;
  start_label: string;
  minutes: number;
  level: number;
  status: StatusInfo;
  budget_pct: number;
  pm25_ug: number;
  confidence: Confidence;
  aqi: number;
  aqi_cat: string;
  dominant: string;
  subindex: Record<string, number>;
  wbgt: number;
  temp: number;
  uv: number;
  rain: number;
  vent_x: number;
}

export interface DayAqi {
  peak: number;
  peak_cat: string;
  peak_hour: number;
  dominant: string;
  now?: number;
  now_cat?: string;
}

export interface Suggestion {
  id: string;
  icon: string;
  title: string;
  detail: string;
}

export interface SplitPlan {
  sessions: [WindowView, WindowView];
  level: number;
  status: StatusInfo;
  budget_pct: number;
  saved_vs_single_pct: number;
}

export interface ParentPlan {
  mode: "parent";
  day: Day;
  date: string;
  timezone: string;
  now_min: number | null;
  profile: {
    age: AgeGroup;
    activity: string;
    activity_key: Activity;
    intensity: string;
    minutes: number;
    asthma: boolean;
    litres_per_min: number;
    body_kg: number;
    per_kg_vs_adult: number;
    daily_litres: number;
  };
  day_aqi: DayAqi;
  hours: HourView[];
  pick: WindowView | null;
  usual: WindowView | null;
  worst: WindowView | null;
  split: SplitPlan | null;
  tomorrow_hint: WindowView | null;
  saved_vs_usual_pct: number | null;
  saved_vs_worst_pct: number | null;
  prevention: Suggestion[];
}

export interface Narration {
  text: string;
  source: "ai" | "template";
}

export interface IntakeResult {
  place: string | null;
  place_match?: Place | null;
  child_name: string | null;
  age_group: AgeGroup | null;
  asthma: boolean | null;
  activity: Activity | null;
  minutes: number | null;
  day: Day | null;
  usual_time: string | null;
}

export interface SchoolSlot {
  id: string;
  name: string;
  activity: SchoolActivity;
  start: number;
  minutes: number;
  movable: boolean;
}

export type SlotAction = "keep" | "move" | "indoors" | "easy";

export interface SchoolRow {
  name: string;
  activity: string;
  minutes: number;
  movable: boolean;
  action: SlotAction;
  current: WindowView;
  final: WindowView;
  saved_pct: number;
  reasons: string[];
}

export interface SchoolPlan {
  mode: "school";
  day: Day;
  date: string;
  students: number;
  age: AgeGroup;
  school_hours: { start: number; end: number; label: string };
  day_aqi: DayAqi;
  hours: HourView[];
  rows: SchoolRow[];
  changes: number;
  cooler_moves: number;
  budget_before: number;
  budget_after: number;
  saved_pct: number;
}
