import { prettyDate } from "./format";
import type { ParentPlan, SchoolPlan, SchoolRow } from "./types";

export type Lang = "en" | "hi";

const CAT_HI: Record<string, string> = {
  Good: "अच्छा",
  Satisfactory: "संतोषजनक",
  Moderate: "मध्यम",
  Poor: "खराब",
  "Very Poor": "बहुत खराब",
  Severe: "गंभीर",
};

const REASON_EN: Record<string, string> = { cooler: "cooler", cleaner: "cleaner air", safer: "safer" };
const REASON_HI: Record<string, string> = { cooler: "कम गर्मी", cleaner: "साफ़ हवा", safer: "ज़्यादा सुरक्षित" };

export function parentMessage(plan: ParentPlan, place: string, lang: Lang): string {
  const p = plan.pick;
  const date = prettyDate(plan.date);
  if (!p) {
    return lang === "hi"
      ? `🐦 बाहर खेलो — ${place}\nआज बाहर खेलने का सुरक्षित समय निकल चुका है। कल सुबह फिर देखें।`
      : `🐦 Bahar Khelo — ${place}\nToday's safe outdoor window has passed. Check again for tomorrow morning.`;
  }
  const saved = plan.saved_vs_usual_pct ?? 0;
  const usual = plan.usual?.start_label;
  if (lang === "hi") {
    return [
      `🐦 बाहर खेलो — ${place}, ${date}`,
      `${plan.profile.activity} (${plan.profile.minutes} मिनट) के लिए सबसे अच्छा समय: ${p.label} — ${p.status.hi}`,
      `हवा: AQI ${p.aqi} (${CAT_HI[p.aqi_cat] ?? p.aqi_cat}) · गर्मी: WBGT ${p.wbgt}°C`,
      saved > 0 && usual ? `${usual} की जगह इस समय खेलने से ${saved}% कम प्रदूषण साँस में जाएगा।` : "",
    ].filter(Boolean).join("\n");
  }
  return [
    `🐦 Bahar Khelo — ${place}, ${date}`,
    `Best time for ${plan.profile.activity.toLowerCase()} (${plan.profile.minutes} min): ${p.label} — ${p.status.label}`,
    `Air: AQI ${p.aqi} (${p.aqi_cat}) · Heat: WBGT ${p.wbgt}°C`,
    saved > 0 && usual ? `Going then instead of ${usual} means ${saved}% less pollution breathed in.` : "",
    plan.tips[0] ?? "",
  ].filter(Boolean).join("\n");
}

function rowLine(r: SchoolRow, lang: Lang): string {
  const why = (lang === "hi" ? REASON_HI : REASON_EN);
  const reasons = r.reasons.map((x) => why[x]).filter(Boolean).join(", ");
  if (lang === "hi") {
    switch (r.action) {
      case "move":
        return `• ${r.name}: ${r.current.start_label} से बदलकर ${r.final.start_label}${reasons ? ` (${reasons})` : ""}`;
      case "indoors":
        return `• ${r.name}: कक्षा/हॉल के अंदर`;
      case "easy":
        return `• ${r.name}: समय वही, हल्की गतिविधि`;
      default:
        return `• ${r.name}: पहले की तरह ${r.current.start_label}`;
    }
  }
  switch (r.action) {
    case "move":
      return `• ${r.name}: moved from ${r.current.start_label} to ${r.final.start_label}${reasons ? ` (${reasons})` : ""}`;
    case "indoors":
      return `• ${r.name}: held indoors`;
    case "easy":
      return `• ${r.name}: as scheduled, lighter activity`;
    default:
      return `• ${r.name}: as usual at ${r.current.start_label}`;
  }
}

export function schoolCircular(plan: SchoolPlan, school: string, lang: Lang): string {
  const date = prettyDate(plan.date);
  const a = plan.day_aqi;
  const rows = plan.rows.map((r) => rowLine(r, lang)).join("\n");
  if (lang === "hi") {
    return [
      "प्रिय अभिभावकगण,",
      `${date} को ${school} में हवा की गुणवत्ता AQI ${a.peak} (${CAT_HI[a.peak_cat] ?? a.peak_cat}) तक रहने का अनुमान है।`,
      "बच्चों की सुरक्षा के लिए बाहर की गतिविधियों में ये बदलाव किए गए हैं:",
      rows,
      "कृपया बच्चों को पानी की बोतल दें। अस्थमा वाले बच्चों का इनहेलर बैग में रखें।",
      "— विद्यालय प्रशासन",
    ].join("\n");
  }
  return [
    "Dear Parents,",
    `The forecast for ${school} on ${date} shows air quality reaching AQI ${a.peak} (${a.peak_cat}).`,
    "To protect our students, outdoor activities are adjusted as follows:",
    rows,
    "Please send a water bottle, and keep inhalers in the bags of children with asthma.",
    "— School Administration",
  ].join("\n");
}
