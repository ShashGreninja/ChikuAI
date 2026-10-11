import styles from "./BudgetRings.module.css";

export interface BudgetRow {
  key: string;
  label: string;
  when: string;
  pct: number;
  pm25: number;
  highlight?: boolean;
}

const R = 46;
const C = 2 * Math.PI * R;

/** One ring per option: how much of the day's healthy-air allowance the outing uses. */
export default function BudgetRings({ rows }: { rows: BudgetRow[] }) {
  return (
    <ul className={styles.rings}>
      {rows.map((r) => {
        const shown = Math.min(r.pct, 100);
        return (
          <li key={r.key} className={styles.ring} data-hi={r.highlight || undefined}>
            <svg viewBox="0 0 120 120" width="128" height="128" role="img" aria-label={`${r.label}: ${r.pct}% of the daily lung budget`}>
              <circle cx="60" cy="60" r={R} className={styles.track} />
              <circle
                cx="60"
                cy="60"
                r={R}
                className={styles.arc}
                strokeDasharray={`${(shown / 100) * C} ${C}`}
                transform="rotate(-90 60 60)"
              />
              <text x="60" y="60" className={styles.pct}>
                {Math.round(r.pct)}%
              </text>
              <text x="60" y="80" className={styles.of}>
                of budget
              </text>
            </svg>
            <b>{r.label}</b>
            <span>{r.when}</span>
            <span className={styles.pm}>≈ {r.pm25} µg PM2.5 inhaled</span>
          </li>
        );
      })}
    </ul>
  );
}
