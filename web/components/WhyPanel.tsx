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
            A {pr.age}-year-old at {pr.intensity} effort breathes about <b>{pr.litres_per_min} litres a minute</b>. Per kg
            of body weight that&apos;s <b>{pr.per_kg_vs_adult}×</b> what an adult takes in doing the same thing. That&apos;s
            why the same AQI hits children harder.
          </p>
        </section>

        <section>
          <h3>How the pollution dose is counted</h3>
          <p className={styles.formula}>
            dose = Σ<sub>hours</sub> (concentration ÷ India&apos;s legal limit) × litres/min × minutes
          </p>
          <p className={styles.lead}>
            A dose of 1,000 means the child breathed in as much pollution as 1,000 litres of air sitting exactly at
            the national limit. For this outing that&apos;s about <b>{p.pm25_ug} µg of PM2.5</b>.
          </p>
        </section>
      </div>
    </details>
  );
}
