import { prettyDate } from "./format";
import type { ParentPlan } from "./types";

export type Lang = "en" | "hi";

const CAT_HI: Record<string, string> = {
  Good: "अच्छा",
  Satisfactory: "संतोषजनक",
  Moderate: "मध्यम",
  Poor: "खराब",
  "Very Poor": "बहुत खराब",
  Severe: "गंभीर",
};

export function parentMessage(plan: ParentPlan, place: string, name: string | null, lang: Lang): string {
  const p = plan.pick;
  const date = prettyDate(plan.date);
  if (!p) {
    return lang === "hi"
      ? `🐦 बाहर खेलो | ${place}\nआज बाहर खेलने का सुरक्षित समय निकल चुका है। कल सुबह फिर देखें।`
      : `🐦 Bahar Khelo | ${place}\nToday's safe outdoor window has passed. Check again for tomorrow morning.`;
  }
  const saved = plan.saved_vs_usual_pct ?? 0;
  const usual = plan.usual?.start_label;
  const tips = plan.prevention.slice(0, 2).map((s) => `• ${s.title}`);
  if (lang === "hi") {
    return [
      `🐦 बाहर खेलो | ${place}, ${date}`,
      `${name ?? "बच्चे"} के ${plan.profile.activity} (${plan.profile.minutes} मिनट) का सबसे अच्छा समय: ${p.label}, ${p.status.hi}`,
      `हवा: AQI ${p.aqi} (${CAT_HI[p.aqi_cat] ?? p.aqi_cat}), गर्मी: WBGT ${p.wbgt}°C`,
      saved >= 5 && usual ? `${usual} की जगह इस समय जाने से ${saved}% कम प्रदूषण साँस में जाएगा।` : "",
    ].filter(Boolean).join("\n");
  }
  return [
    `🐦 Bahar Khelo | ${place}, ${date}`,
    `Best time for ${name ?? "the kids"} (${plan.profile.activity.toLowerCase()}, ${plan.profile.minutes} min): ${p.label}. ${p.status.label}.`,
    `Air: AQI ${p.aqi} (${p.aqi_cat}). Heat: WBGT ${p.wbgt}°C.`,
    saved >= 5 && usual ? `Going then instead of ${usual} means ${saved}% less pollution breathed in.` : "",
    ...tips,
  ].filter(Boolean).join("\n");
}
