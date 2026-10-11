import type { Mood } from "@/components/Chiku";
import { drivers } from "./format";
import type { HourView, WindowView } from "./types";

export function moodFor(pick: WindowView | null, hours: HourView[]): Mood {
  if (!pick) return "sleepy";
  if (pick.level === 0) return "happy";
  if (pick.level === 1) return "careful";
  const d = drivers(hours, pick);
  return d.includes("heat") && !d.includes("air") ? "hot" : "masked";
}

/** WBGT flag lines, mirrored from api/baharkhelo/heat.py for the explainer. */
export const HEAT_THRESHOLDS: Record<string, [number, number, number]> = {
  sedentary: [28, 31, 33],
  light: [27, 30, 32],
  moderate: [25, 28, 31],
  high: [23, 26, 29],
};
