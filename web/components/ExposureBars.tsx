"use client";

import { useState } from "react";
import { nf } from "@/lib/format";
import styles from "./ExposureBars.module.css";

export interface ExposureRow {
  key: string;
  label: string;
  when: string;
  dose: number;
  pm25: number;
  highlight?: boolean;
}

/**
 * Pollution dose for the same outing at different times, on one shared axis.
 * Bars start at zero so lengths are honest; values are labelled directly.
 */
export default function ExposureBars({ rows, caption }: { rows: ExposureRow[]; caption?: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(...rows.map((r) => r.dose), 1);
  return (
    <figure className={styles.fig}>
      <div className={styles.rows}>
        {rows.map((r) => (
          <div
            key={r.key}
            className={styles.row}
            onMouseEnter={() => setHover(r.key)}
            onMouseLeave={() => setHover(null)}
          >
            <div className={styles.name}>
              <b>{r.label}</b>
              <span>{r.when}</span>
            </div>
            <div className={styles.track}>
              <div
                className={styles.bar}
                data-hi={r.highlight || undefined}
                style={{ width: `${Math.max(2, (r.dose / max) * 100)}%` }}
              />
              <span className={styles.value}>{nf.format(r.dose)}</span>
              {hover === r.key && (
                <div className={styles.tip} role="status">
                  ≈ {r.pm25} µg of PM2.5 reaches the lungs · {nf.format(r.dose)} litres-at-the-limit
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {caption && <figcaption className={styles.cap}>{caption}</figcaption>}
    </figure>
  );
}
