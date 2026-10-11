"use client";

import { useState } from "react";
import { clock, hourLabel, STATUS_META } from "@/lib/format";
import type { HourView, StatusKey } from "@/lib/types";
import styles from "./DayStrip.module.css";

const LEVEL_KEY: StatusKey[] = ["go", "caution", "limit", "stop"];

export interface Marker {
  start: number; // minutes from midnight
  end: number;
  label: string;
  kind: "pick" | "usual" | "slot" | "moved";
}

/**
 * The day at a glance: one column per hour, three rows (overall, air, heat).
 * Colour is always backed by an icon in the cell and a word in the tooltip/table.
 */
export default function DayStrip({ hours, from = 6, to = 20, markers = [], nowMin = null, band }: {
  hours: HourView[];
  from?: number;
  to?: number;
  markers?: Marker[];
  nowMin?: number | null;
  band?: { start: number; end: number; label: string };
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const shown = hours.filter((h) => h.hour >= from && h.hour < to);
  const span = (to - from) * 60;
  const pos = (min: number) => `${((min - from * 60) / span) * 100}%`;
  const width = (a: number, b: number) => `${((b - a) / span) * 100}%`;
  const hovered = shown.find((h) => h.hour === hover);

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <ul className={styles.legend} aria-label="Legend">
          {LEVEL_KEY.map((k) => (
            <li key={k} data-status={k}>
              <span className={styles.swatch} aria-hidden>
                {STATUS_META[k].icon}
              </span>
              {STATUS_META[k].label}
            </li>
          ))}
        </ul>
        <button type="button" className={styles.toggle} onClick={() => setAsTable((v) => !v)}>
          {asTable ? "Show as chart" : "Show as table"}
        </button>
      </div>

      {asTable ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Hour</th>
                <th scope="col">Verdict</th>
                <th scope="col">AQI</th>
                <th scope="col">Main pollutant</th>
                <th scope="col">WBGT °C</th>
                <th scope="col">Temp °C</th>
                <th scope="col">Rain %</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((h) => (
                <tr key={h.hour}>
                  <th scope="row">{clock(h.hour * 60)}</th>
                  <td>{STATUS_META[h.status].label}</td>
                  <td>
                    {h.aqi} <span className={styles.muted}>{h.aqi_cat}</span>
                  </td>
                  <td>{h.dominant}</td>
                  <td>{h.wbgt}</td>
                  <td>{h.temp}</td>
                  <td>{h.rain}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.chart}>
          <div className={styles.rowLabels} aria-hidden>
            <span className={styles.rowLabelMain}>Overall</span>
            <span>Air</span>
            <span>Heat</span>
          </div>

          <div className={styles.plot} onMouseLeave={() => setHover(null)}>
            {band && (
              <div className={styles.band} style={{ left: pos(band.start), width: width(band.start, band.end) }}>
                <span>{band.label}</span>
              </div>
            )}

            <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${shown.length}, 1fr)` }}>
              {shown.map((h) => {
                const past = nowMin !== null && (h.hour + 1) * 60 <= nowMin;
                return (
                  <button
                    key={h.hour}
                    type="button"
                    className={styles.col}
                    data-past={past || undefined}
                    data-hover={hover === h.hour || undefined}
                    onMouseEnter={() => setHover(h.hour)}
                    onFocus={() => setHover(h.hour)}
                    onBlur={() => setHover(null)}
                    aria-label={`${clock(h.hour * 60)}: ${STATUS_META[h.status].label}. AQI ${h.aqi} ${h.aqi_cat}, WBGT ${h.wbgt} degrees`}
                  >
                    <span className={styles.main} data-status={h.status}>
                      <span aria-hidden>{STATUS_META[h.status].icon}</span>
                    </span>
                    <span className={styles.sub} data-status={LEVEL_KEY[h.air_level]} />
                    <span className={styles.sub} data-status={LEVEL_KEY[h.heat_level]} />
                  </button>
                );
              })}
            </div>

            {markers.map((m, i) => (
              <div
                key={`${m.kind}-${i}`}
                className={styles.marker}
                data-kind={m.kind}
                style={{ left: pos(m.start), width: width(m.start, m.end) }}
              >
                <span className={styles.markerLabel}>{m.label}</span>
              </div>
            ))}

            {nowMin !== null && nowMin >= from * 60 && nowMin < to * 60 && (
              <div className={styles.now} style={{ left: pos(nowMin) }}>
                <span>now</span>
              </div>
            )}

            {hovered && (
              <div
                className={styles.tip}
                role="status"
                style={{
                  left: pos(hovered.hour * 60 + 30),
                  transform: `translateX(${hovered.hour - from < 2 ? "-15%" : to - hovered.hour <= 2 ? "-85%" : "-50%"})`,
                }}
              >
                <div className={styles.tipHead}>
                  {clock(hovered.hour * 60)} – {clock((hovered.hour + 1) * 60)}
                </div>
                <div className={styles.tipVerdict}>{STATUS_META[hovered.status].label}</div>
                <dl>
                  <dt>Air</dt>
                  <dd>
                    AQI <b>{hovered.aqi}</b> {hovered.aqi_cat} · {hovered.dominant}
                  </dd>
                  <dt>Heat</dt>
                  <dd>
                    WBGT <b>{hovered.wbgt}°</b> · {hovered.temp}° air
                  </dd>
                  <dt>PM2.5</dt>
                  <dd>{hovered.pm25} µg/m³</dd>
                  {hovered.rain >= 20 && (
                    <>
                      <dt>Rain</dt>
                      <dd>{hovered.rain}% chance</dd>
                    </>
                  )}
                </dl>
              </div>
            )}

            <div className={styles.axis} style={{ gridTemplateColumns: `repeat(${shown.length}, 1fr)` }} aria-hidden>
              {shown.map((h) => (
                <span key={h.hour}>{(h.hour - from) % 2 === 0 ? hourLabel(h.hour) : ""}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
