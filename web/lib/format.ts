import type { HourView, StatusKey, WindowView } from "./types";

export function clock(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const h12 = h % 12 || 12;
  return `${h12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;
}

export function hourLabel(hour: number): string {
  const h12 = hour % 12 || 12;
  return `${h12}${hour < 12 ? "a" : "p"}`;
}

export function toTimeInput(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export function fromTimeInput(v: string): number {
  const [h, m] = v.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function prettyDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

export const nf = new Intl.NumberFormat("en-IN");

export const STATUS_META: Record<StatusKey, { label: string; hi: string; icon: string }> = {
  go: { label: "Go play", hi: "खेलो!", icon: "✓" },
  caution: { label: "Go easy", hi: "आराम से", icon: "!" },
  limit: { label: "Keep it short", hi: "थोड़ी देर", icon: "◐" },
  stop: { label: "Stay indoors", hi: "अंदर रहो", icon: "✕" },
};

/** Hours an outing touches, for explaining what drove its flag. */
export function hoursIn(hours: HourView[], w: WindowView): HourView[] {
  return hours.filter((h) => h.hour * 60 < w.end && (h.hour + 1) * 60 > w.start);
}

/** What made this window less than perfect: "air", "heat", or both. */
export function drivers(hours: HourView[], w: WindowView): ("air" | "heat")[] {
  const hs = hoursIn(hours, w);
  const air = Math.max(...hs.map((h) => h.air_level));
  const heat = Math.max(...hs.map((h) => h.heat_level));
  const out: ("air" | "heat")[] = [];
  if (air > 0 && air >= heat) out.push("air");
  if (heat > 0 && heat >= air) out.push("heat");
  return out;
}
