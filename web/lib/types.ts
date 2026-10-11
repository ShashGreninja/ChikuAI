export type StatusKey = "go" | "caution" | "limit" | "stop";
export type Day = "today" | "tomorrow";
export type AgeGroup = "3-5" | "6-10" | "11-15";
export type Activity = "play" | "cycling" | "sports" | "walk";
export type SchoolActivity = "pe" | "recess" | "assembly" | "sports" | "walk";

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
  factor: number;
  pm25: number;
  temp: number;
  feels: number;
  rh: number;
  wbgt: number;
  uv: number;
  rain: number;
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
  level: number;
  status: StatusInfo;
  dose: number;
  pm25_ug: number;
  aqi: number;
  aqi_cat: string;
  dominant: string;
  subindex: Record<string, number>;
  wbgt: number;
  temp: number;
  uv: number;
  rain: number;
}

export interface DayAqi {
  peak: number;
  peak_cat: string;
  peak_hour: number;
  dominant: string;
  now?: number;
  now_cat?: string;
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
    intensity: string;
    minutes: number;
    asthma: boolean;
    litres_per_min: number;
    body_kg: number;
    per_kg_vs_adult: number;
  };
  day_aqi: DayAqi;
  hours: HourView[];
  pick: WindowView | null;
  usual: WindowView | null;
  worst: WindowView | null;
  tomorrow_hint: WindowView | null;
  saved_vs_usual_pct: number | null;
  saved_vs_worst_pct: number | null;
  tips: string[];
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
  dose_before: number;
  dose_after: number;
  saved_pct: number;
  saved_school_dose: number;
}
