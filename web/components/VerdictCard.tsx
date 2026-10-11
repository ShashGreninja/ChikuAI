import Chiku, { type Mood } from "./Chiku";
import StatusBadge from "./StatusBadge";
import { drivers, prettyDate } from "@/lib/format";
import type { ParentPlan } from "@/lib/types";
import styles from "./VerdictCard.module.css";

const HEADLINE = [
  "Bahar khelo! Best time is",
  "Go, but take it easy:",
  "Keep it short. Least risky time is",
  "Best to stay in. If you must go out:",
];

export default function VerdictCard({ plan, place, mood }: { plan: ParentPlan; place: string; mood: Mood }) {
  const p = plan.pick;
  const dayWord = plan.day === "today" ? "Today" : "Tomorrow";
  const why = p ? drivers(plan.hours, p) : [];

  return (
    <section className={styles.card} aria-live="polite">
      <div className={styles.bird}>
        <Chiku mood={mood} size={170} />
      </div>
      <div className={styles.bubble}>
        <p className={styles.meta}>
          {dayWord}, {prettyDate(plan.date)} · {place} · {plan.profile.activity}, {plan.profile.minutes} min
        </p>

        {p ? (
          <>
            <h2 className={styles.headline}>
              {HEADLINE[p.level]} <span className={styles.time}>{p.label}</span>
            </h2>
            <div className={styles.badges}>
              <StatusBadge status={p.status.key} size="lg" />
              <StatusBadge status={p.status.key} size="lg" hindi />
            </div>
            <p className={styles.reason}>
              AQI <b>{p.aqi}</b> ({p.aqi_cat}, mostly {p.dominant}) · heat stress <b>{p.wbgt}°C</b> WBGT
              {why.length > 0 && (
                <>
                  {" "}
                  · held back by <b>{why.join(" and ")}</b>
                </>
              )}
            </p>
          </>
        ) : (
          <>
            <h2 className={styles.headline}>Today&apos;s outdoor window has passed.</h2>
            <p className={styles.reason}>Chiku is asleep. Check tomorrow&apos;s plan instead.</p>
          </>
        )}

        {plan.tomorrow_hint && (
          <p className={styles.hint}>
            🌅 Tomorrow looks better: <b>{plan.tomorrow_hint.label}</b> ({plan.tomorrow_hint.status.label.toLowerCase()})
          </p>
        )}

        {plan.tips.length > 0 && (
          <ul className={styles.tips}>
            {plan.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
