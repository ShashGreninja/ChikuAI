"use client";

import { useState } from "react";
import { findEventSlots } from "@/lib/api";
import { fromTimeInput, prettyDate, toTimeInput } from "@/lib/format";
import { KIND_LABEL, type Kind, type SchoolSetup } from "@/lib/school";
import type { AgeGroup, EventSlots } from "@/lib/types";
import StatusBadge from "../StatusBadge";
import ui from "../ui.module.css";
import styles from "./School.module.css";

const DAY_NAME = { today: "Today", tomorrow: "Tomorrow", "2": "Day after" } as const;

/** "Which day this week is best for the inter-house match?" */
export default function EventFinder({ setup }: { setup: SchoolSetup }) {
  const [name, setName] = useState("Inter-house match");
  const [kind, setKind] = useState<Kind>("sports");
  const [age, setAge] = useState<AgeGroup>("11-15");
  const [minutes, setMinutes] = useState(90);
  const [earliest, setEarliest] = useState(setup.start);
  const [latest, setLatest] = useState(Math.min(setup.end + 120, 19 * 60));
  const [result, setResult] = useState<EventSlots | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!setup.place) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await findEventSlots({
        lat: setup.place.lat, lon: setup.place.lon, age, kind, minutes, earliest, latest,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.stack}>
      <form className={ui.card} onSubmit={run}>
        <h3 className={ui.cardTitle}>Find the best day for an event</h3>
        <p className={ui.cardSub}>
          For one-offs you can schedule: a match, sports day practice, a picnic, an outdoor exam. Chiku checks the next
          three days.
        </p>
        <div className={styles.eventGrid}>
          <label>
            <span className={ui.label}>Event</span>
            <input className={ui.input} value={name} maxLength={50} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            <span className={ui.label}>Kind of activity</span>
            <select className={ui.input} value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
              {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={ui.label}>Youngest group taking part</span>
            <select className={ui.input} value={age} onChange={(e) => setAge(e.target.value as AgeGroup)}>
              <option value="3-5">Pre-primary (3-5)</option>
              <option value="6-10">Primary (6-10)</option>
              <option value="11-15">Middle (11-15)</option>
            </select>
          </label>
          <label>
            <span className={ui.label}>Duration</span>
            <select className={ui.input} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
              {[30, 45, 60, 90, 120, 180].map((m) => (
                <option key={m} value={m}>
                  {m < 60 ? `${m} min` : `${m / 60} hour${m > 60 ? "s" : ""}`}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span className={ui.label}>Between</span>
            <div className={styles.hours}>
              <input type="time" className={ui.input} value={toTimeInput(earliest)} aria-label="Earliest start"
                onChange={(e) => e.target.value && setEarliest(fromTimeInput(e.target.value))} />
              <span>and</span>
              <input type="time" className={ui.input} value={toTimeInput(latest)} aria-label="Latest finish"
                onChange={(e) => e.target.value && setLatest(fromTimeInput(e.target.value))} />
            </div>
          </div>
        </div>
        <button className={ui.btn} disabled={busy || !setup.place} style={{ marginTop: 16 }}>
          {busy ? "Checking three days…" : "Find the best day"}
        </button>
        {error && (
          <p className={ui.error} role="alert" style={{ marginTop: 12 }}>
            {error}
          </p>
        )}
      </form>

      {result && (
        <ul className={styles.eventDays}>
          {result.days.map((d) => (
            <li key={d.day} className={styles.eventDay} data-best={result.best === d.day || undefined}>
              {result.best === d.day && <span className={styles.bestTag}>Best day for {name || "this"}</span>}
              <p className={ui.eyebrow}>
                {DAY_NAME[d.day]}, {prettyDate(d.date)}
              </p>
              {d.window ? (
                <>
                  <b className={styles.eventTime}>{d.window.label}</b>
                  <StatusBadge status={d.window.status.key} />
                  <p>{d.window.action}</p>
                  <span className={styles.why}>
                    AQI {d.window.aqi} ({d.window.aqi_cat}) · WBGT {d.window.wbgt}°
                  </span>
                </>
              ) : (
                <p>No window left in that range.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
