import { HEAT_THRESHOLDS } from "@/lib/mood";
import type { ParentPlan } from "@/lib/types";
import styles from "./WhyPanel.module.css";

const CATS = [
  { max: 50, name: "Good" },
  { max: 100, name: "Satisfactory" },
  { max: 200, name: "Moderate" },
  { max: 300, name: "Poor" },
  { max: 400, name: "Very Poor" },
  { max: 500, name: "Severe" },
];

export default function WhyPanel({ plan }: { plan: ParentPlan }) {
  const p = plan.pick;
  if (!p) return null;
  const pr = plan.profile;
  const subs = Object.entries(p.subindex).sort((a, b) => b[1] - a[1]);
  const [caution, limit, stop] = HEAT_THRESHOLDS[pr.intensity];
  const heatScale = { min: 15, max: 35 };
  const at = (v: number) => `${((Math.min(Math.max(v, heatScale.min), heatScale.max) - heatScale.min) / (heatScale.max - heatScale.min)) * 100}%`;

  return (
    <details className={styles.panel}>
      <summary className={styles.summary}>
        <span>Why this time? See the numbers</span>
        <span className={styles.chev} aria-hidden>
          ▾
        </span>
      </summary>

      <div className={styles.grid}>
        <section>
          <h3>Air: India AQI breakdown</h3>
          <p className={styles.lead}>
            The AQI is the worst of six pollutant sub-indices (CPCB method). During {p.label} it peaks at{" "}
            <b>{p.aqi}</b>, driven by <b>{p.dominant}</b>.
          </p>
          <ul className={styles.subs}>
            {subs.map(([k, v]) => (
              <li key={k}>
                <span className={styles.pol}>{k}</span>
                <span className={styles.track}>
                  <span className={styles.fill} data-dom={k === p.dominant || undefined} style={{ width: `${(Math.min(v, 500) / 500) * 100}%` }} />
                </span>
                <span className={styles.num}>{v}</span>
              </li>
            ))}
          </ul>
          <p className={styles.scale}>
            {CATS.map((c) => (
              <span key={c.name}>
                ≤{c.max} {c.name}
              </span>
            ))}
          </p>
        </section>

        <section>
          <h3>Heat: how hot it feels to a playing child</h3>
          <p className={styles.lead}>
            WBGT combines temperature, humidity and sun. For <b>{pr.activity.toLowerCase()}</b> ({pr.intensity} effort) we
            ease off at {caution}°C, cut short at {limit}°C and stop at {stop}°C
            {pr.age === "3-5" ? " (1°C earlier for under-6s)" : ""}.
          </p>
          <div className={styles.heat}>
            <div className={styles.heatBar}>
              <span style={{ left: at(caution) }} data-line="caution" />
              <span style={{ left: at(limit) }} data-line="limit" />
              <span style={{ left: at(stop) }} data-line="stop" />
              <b className={styles.heatDot} style={{ left: at(p.wbgt) }} title={`${p.wbgt}°C`} />
            </div>
            <div className={styles.heatAxis}>
              <span>15°</span>
              <span>WBGT during this window: {p.wbgt}°C (air {p.temp}°C)</span>
              <span>35°</span>
            </div>
          </div>
        </section>

        <section>
          <h3>Breathing: why kids are different</h3>
          <p className={styles.lead}>
            A {pr.age} year old at {pr.intensity} effort breathes about <b>{pr.litres_per_min} litres a minute</b>. Per kg
            of body weight that&apos;s <b>{pr.per_kg_vs_adult}×</b> what an adult takes in doing the same thing. Heat adds
            more: breathing rises about 3% for every degree of WBGT above 22°C
            {p.vent_x > 1.01 ? `, so +${Math.round((p.vent_x - 1) * 100)}% in this window` : ""}.
          </p>
        </section>

        <section>
          <h3>The lung budget</h3>
          <p className={styles.formula}>
            spend = Σ<sub>hours</sub> (C ÷ WHO guideline) × litres/min × heat factor × minutes
          </p>
          <p className={styles.lead}>
            Divided by what the child breathes in a whole day ({pr.daily_litres.toLocaleString("en-IN")} L), this
            outing uses <b>{p.budget_pct}%</b> of a healthy day&apos;s allowance, about <b>{p.pm25_ug} µg of PM2.5</b>.
            Windows are ranked on this spend inflated by forecast uncertainty, so a steady clean hour beats a clean
            looking hour between two spikes. Confidence here: <b>{p.confidence}</b>.
          </p>
        </section>
      </div>
    </details>
  );
}
