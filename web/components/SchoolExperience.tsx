"use client";

import { useState } from "react";
import { nf, prettyDate } from "@/lib/format";
import type { SchoolPlan } from "@/lib/types";
import Chiku, { type Mood } from "./Chiku";
import Scene, { type Sky } from "./Scene";
import SchoolPlanner, { type SchoolResultInfo } from "./SchoolPlanner";
import ui from "./ui.module.css";
import stage from "./ParentExperience.module.css";
import guide from "./ChikuGuide.module.css";
import styles from "./SchoolPlanner.module.css";

function look(plan: SchoolPlan): { mood: Mood; sky: Sky } {
  const indoors = plan.rows.some((r) => r.action === "indoors");
  if (plan.changes === 0) return { mood: "happy", sky: "clear" };
  if (indoors) return { mood: "masked", sky: "smog" };
  if (plan.cooler_moves > 0) return { mood: "hot", sky: "hot" };
  return { mood: "careful", sky: "hazy" };
}

export default function SchoolExperience() {
  const [result, setResult] = useState<SchoolResultInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const { mood, sky } = result ? look(result.plan) : { mood: "careful" as Mood, sky: "clear" as Sky };

  return (
    <>
      <section className={stage.stage} style={{ minHeight: 460 }}>
        <Scene sky={sky} />
        <div className={stage.inner}>
          <div className={stage.chiku}>
            <Chiku mood={busy ? "thinking" : mood} size={210} />
          </div>
          <div className={stage.talk}>
            <div className={guide.bubble} aria-live="polite">
              {busy ? (
                <p className={guide.say}>Checking every period against the forecast…</p>
              ) : result ? (
                <Summary {...result} />
              ) : (
                <>
                  <p className={guide.say}>
                    Namaste, teachers! Give me your outdoor periods and I&apos;ll fit them around the air and the heat
                    on your campus.
                  </p>
                  <p className={guide.small}>
                    I keep fixed periods where they are, move what can move, never double-book a slot, and write the
                    note for parents. Fill in the form below to start.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className={styles.below}>
        <SchoolPlanner onResult={setResult} onBusy={setBusy} />
      </div>
    </>
  );
}

function Summary({ plan, place }: SchoolResultInfo) {
  const n = plan.rows.length;
  const pmBefore = plan.rows.reduce((a, r) => a + r.current.pm25_ug, 0);
  const pmAfter = plan.rows.reduce((a, r) => a + r.final.pm25_ug, 0);
  const savedMg = Math.max(0, ((pmBefore - pmAfter) * plan.students) / 1000);
  return (
    <div className={guide.verdict}>
      <p className={ui.eyebrow}>
        {plan.day === "today" ? "Today" : "Tomorrow"}, {prettyDate(plan.date)} · {place.name}
      </p>
      <h2 className={guide.headline}>
        {plan.changes === 0
          ? "All outdoor periods look fine as planned."
          : `${plan.changes} of ${n} outdoor period${n > 1 ? "s" : ""} need${plan.changes === 1 ? "s" : ""} a change.`}
      </h2>
      <div className={styles.stats}>
        {plan.saved_pct > 0 && (
          <div>
            <b>{plan.saved_pct}%</b>
            <span>less of each child&apos;s lung budget used</span>
          </div>
        )}
        {savedMg >= 0.1 && (
          <div>
            <b>{nf.format(Math.round(savedMg * 10) / 10)} mg</b>
            <span>of PM2.5 kept out of {nf.format(plan.students)} pairs of lungs</span>
          </div>
        )}
        {plan.cooler_moves > 0 && (
          <div>
            <b>{plan.cooler_moves}</b>
            <span>period{plan.cooler_moves > 1 ? "s" : ""} moved out of the heat</span>
          </div>
        )}
        <div>
          <b>{plan.day_aqi.peak}</b>
          <span>
            peak AQI ({plan.day_aqi.peak_cat}, {plan.day_aqi.dominant})
          </span>
        </div>
      </div>
    </div>
  );
}
