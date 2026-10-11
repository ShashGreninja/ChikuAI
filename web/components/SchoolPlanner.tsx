"use client";

import { useState } from "react";
import { getSchoolPlan } from "@/lib/api";
import { fromTimeInput, nf, prettyDate, toTimeInput } from "@/lib/format";
import { schoolCircular } from "@/lib/messages";
import { useStored } from "@/lib/useStored";
import type { AgeGroup, Day, Place, SchoolPlan, SchoolRow, SchoolSlot } from "@/lib/types";
import Chiku, { type Mood } from "./Chiku";
import DayStrip, { type Marker } from "./DayStrip";
import PlaceSearch from "./PlaceSearch";
import Segmented from "./Segmented";
import ShareBox from "./ShareBox";
import StatusBadge from "./StatusBadge";
import TimetableEditor from "./TimetableEditor";
import ui from "./ui.module.css";
import planner from "./Planner.module.css";
import styles from "./SchoolPlanner.module.css";

const DEFAULT_SLOTS: SchoolSlot[] = [
  { id: "1", name: "Morning assembly", activity: "assembly", start: 8 * 60, minutes: 20, movable: false },
  { id: "2", name: "PE, Class 5", activity: "pe", start: 11 * 60, minutes: 40, movable: true },
  { id: "3", name: "Lunch recess", activity: "recess", start: 12 * 60, minutes: 30, movable: true },
  { id: "4", name: "Football practice", activity: "sports", start: 13 * 60 + 15, minutes: 45, movable: true },
];

const ACTION_LABEL: Record<SchoolRow["action"], string> = {
  keep: "Keep",
  move: "Move",
  indoors: "Indoors",
  easy: "Go easy",
};

const REASON_LABEL: Record<string, string> = {
  cooler: "cooler",
  cleaner: "cleaner air",
  safer: "safer",
  air: "poor air",
  heat: "too hot",
  clear: "all clear",
};

export default function SchoolPlanner() {
  const [place, setPlace] = useStored<Place | null>("bk.place", null);
  const [school, setSchool] = useStored<string>("bk.school", "our school");
  const [students, setStudents] = useState(600);
  const [age, setAge] = useState<AgeGroup>("6-10");
  const [day, setDay] = useState<Day>("tomorrow");
  const [start, setStart] = useState(8 * 60);
  const [end, setEnd] = useState(14 * 60);
  const [slots, setSlots] = useState<SchoolSlot[]>(DEFAULT_SLOTS);

  const [plan, setPlan] = useState<SchoolPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!place) {
      setError("Pick the school's location first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setPlan(
        await getSchoolPlan({
          lat: place.lat, lon: place.lon, students, age, day, school_start: start, school_end: end, slots,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={planner.layout} data-answer-first={plan || undefined}>
      <form className={`${ui.card} ${planner.form}`} onSubmit={run} aria-label="School day details">
        <PlaceSearch value={place} onChange={setPlace} label="School location" />

        <div className={styles.pair}>
          <div>
            <label className={ui.label} htmlFor="school-name">
              School name
            </label>
            <input id="school-name" className={ui.input} value={school} maxLength={60} onChange={(e) => setSchool(e.target.value)} />
          </div>
          <div>
            <label className={ui.label} htmlFor="students">
              Students
            </label>
            <input
              id="students"
              type="number"
              className={ui.input}
              min={1}
              max={20000}
              value={students}
              onChange={(e) => setStudents(Math.max(1, Math.min(20000, Number(e.target.value) || 1)))}
            />
          </div>
        </div>

        <Segmented<AgeGroup>
          label="Which wing?"
          options={[
            { value: "3-5", label: "Pre-primary", sub: "3–5 yrs" },
            { value: "6-10", label: "Primary", sub: "6–10 yrs" },
            { value: "11-15", label: "Middle", sub: "11–15 yrs" },
          ]}
          value={age}
          onChange={setAge}
        />

        <div className={styles.pair}>
          <Segmented<Day>
            label="Plan for"
            options={[
              { value: "today", label: "Today" },
              { value: "tomorrow", label: "Tomorrow" },
            ]}
            value={day}
            onChange={setDay}
          />
          <div>
            <span className={ui.label}>School hours</span>
            <div className={styles.hours}>
              <input type="time" className={ui.input} value={toTimeInput(start)} aria-label="School starts"
                onChange={(e) => e.target.value && setStart(fromTimeInput(e.target.value))} />
              <span>to</span>
              <input type="time" className={ui.input} value={toTimeInput(end)} aria-label="School ends"
                onChange={(e) => e.target.value && setEnd(fromTimeInput(e.target.value))} />
            </div>
          </div>
        </div>

        <TimetableEditor slots={slots} onChange={setSlots} />

        <button className={ui.btn} disabled={loading}>
          {loading ? "Checking the sky…" : "Plan the school day"}
        </button>
      </form>

      <div className={planner.results}>
        {error && (
          <p className={ui.error} role="alert">
            {error}
          </p>
        )}

        {!plan && !loading && (
          <div className={planner.empty}>
            <Chiku mood="careful" size={150} />
            <div>
              <h2>One minute, every morning.</h2>
              <p>
                Enter the outdoor periods from your timetable. Chiku checks the hourly air and heat forecast for your
                campus, moves what can move, brings indoors what can&apos;t, and writes the note for parents.
              </p>
            </div>
          </div>
        )}

        {loading && !plan && (
          <div className={planner.empty}>
            <Chiku mood="thinking" size={130} />
            <p>Checking every period against the forecast…</p>
          </div>
        )}

        {plan && place && <SchoolResult plan={plan} place={place} school={school} loading={loading} />}
      </div>
    </div>
  );
}

function SchoolResult({ plan, place, school, loading }: {
  plan: SchoolPlan;
  place: Place;
  school: string;
  loading: boolean;
}) {
  const n = plan.rows.length;
  const pmBefore = plan.rows.reduce((a, r) => a + r.current.pm25_ug, 0);
  const pmAfter = plan.rows.reduce((a, r) => a + r.final.pm25_ug, 0);
  const pmSavedSchoolMg = Math.max(0, ((pmBefore - pmAfter) * plan.students) / 1000);
  const worstFinal = Math.max(...plan.rows.map((r) => (r.action === "indoors" ? 0 : r.final.level)));
  const anyIndoors = plan.rows.some((r) => r.action === "indoors");
  const mood: Mood = plan.changes === 0 ? "happy" : anyIndoors ? "masked" : worstFinal >= 1 ? "careful" : "happy";

  const markers: Marker[] = plan.rows
    .filter((r) => r.action !== "indoors")
    .map((r) => ({
      start: r.final.start,
      end: r.final.end,
      label: r.name.split(" ")[0],
      kind: r.action === "move" ? "moved" : "slot",
    }));

  return (
    <div className={planner.stack} data-loading={loading || undefined}>
      <section className={styles.summary}>
        <Chiku mood={mood} size={150} />
        <div className={styles.summaryText}>
          <p className={ui.eyebrow}>
            {plan.day === "today" ? "Today" : "Tomorrow"}, {prettyDate(plan.date)} · {place.name}
          </p>
          <h2>
            {plan.changes === 0
              ? "All outdoor periods look fine as planned."
              : `${plan.changes} of ${n} outdoor period${n > 1 ? "s" : ""} need${plan.changes === 1 ? "s" : ""} a change.`}
          </h2>
          <div className={styles.stats}>
            {plan.saved_pct > 0 && (
              <div>
                <b>{plan.saved_pct}%</b>
                <span>less pollution breathed per child</span>
              </div>
            )}
            {pmSavedSchoolMg >= 0.1 && (
              <div>
                <b>{nf.format(Math.round(pmSavedSchoolMg * 10) / 10)} mg</b>
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
      </section>

      <section className={ui.card}>
        <h3 className={ui.cardTitle}>Revised timetable</h3>
        <p className={ui.cardSub}>No two periods overlap. Fixed periods stay put but may go indoors.</p>
        <ul className={styles.rows}>
          {plan.rows.map((r) => (
            <li key={r.name} className={styles.row} data-action={r.action}>
              <div className={styles.rowName}>
                <b>{r.name}</b>
                <span>
                  {r.activity} · {r.minutes} min{!r.movable && " · fixed"}
                </span>
              </div>
              <div className={styles.when}>
                <span className={r.action === "keep" || r.action === "easy" ? undefined : styles.struck}>{r.current.start_label}</span>
                <StatusBadge status={r.current.status.key} size="sm" />
              </div>
              <span className={styles.arrow} aria-hidden>
                →
              </span>
              <div className={styles.when}>
                {r.action === "indoors" ? (
                  <span className={styles.indoor}>🏫 Indoors</span>
                ) : (
                  <>
                    <span>{r.final.start_label}</span>
                    <StatusBadge status={r.final.status.key} size="sm" />
                  </>
                )}
              </div>
              <div className={styles.verdict}>
                <span className={styles.action} data-action={r.action}>
                  {ACTION_LABEL[r.action]}
                </span>
                {r.reasons.filter((x) => x !== "clear").map((x) => (
                  <span key={x} className={styles.reason}>
                    {REASON_LABEL[x] ?? x}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
        {anyIndoors && (
          <p className={styles.note}>
            Indoors isn&apos;t zero: classroom air carries roughly 60% of outdoor PM2.5. On Poor days keep doors and
            windows shut during peak hours and run air purifiers if you have them.
          </p>
        )}
      </section>

      <section className={ui.card}>
        <h3 className={ui.cardTitle}>The school day, hour by hour</h3>
        <p className={ui.cardSub}>Outlined boxes show where each outdoor period now sits (solid = moved). The bracket marks school hours.</p>
        <DayStrip
          hours={plan.hours}
          from={6}
          to={18}
          markers={markers}
          band={{ start: plan.school_hours.start, end: plan.school_hours.end, label: "school hours" }}
        />
      </section>

      <ShareBox
        title="Circular for parents"
        sub="Paste into the class WhatsApp groups or the school app."
        build={(lang) => schoolCircular(plan, school || "our school", lang)}
      />
    </div>
  );
}
