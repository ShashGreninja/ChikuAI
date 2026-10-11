"use client";

import { useState } from "react";
import { fromTimeInput, toTimeInput } from "@/lib/format";
import {
  DAYS, KIND_LABEL, newId, parseTimetable, type Kind, type SchoolClass, type SchoolSetup, type TimetableEntry,
} from "@/lib/school";
import type { AgeGroup } from "@/lib/types";
import PlaceSearch from "../PlaceSearch";
import ui from "../ui.module.css";
import styles from "./School.module.css";

const AGE_LABEL: Record<AgeGroup, string> = { "3-5": "Pre-primary (3-5)", "6-10": "Primary (6-10)", "11-15": "Middle (11-15)" };

/** Set up once: school details, classes, and the weekly outdoor timetable. Saves as you type. */
export default function TimetableSetup({ setup, onChange, onDone }: {
  setup: SchoolSetup;
  onChange: (s: SchoolSetup) => void;
  onDone: () => void;
}) {
  const set = (patch: Partial<SchoolSetup>) => onChange({ ...setup, ...patch });
  const setClass = (id: string, patch: Partial<SchoolClass>) =>
    set({ classes: setup.classes.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const setEntry = (id: string, patch: Partial<TimetableEntry>) =>
    set({ timetable: setup.timetable.map((t) => (t.id === id ? { ...t, ...patch } : t)) });

  const sorted = [...setup.timetable].sort((a, b) => a.start - b.start);

  return (
    <div className={styles.stack}>
      <section className={ui.card}>
        <h3 className={ui.cardTitle}>School</h3>
        <div className={styles.grid2}>
          <div>
            <label className={ui.label} htmlFor="sch-name">
              Name
            </label>
            <input id="sch-name" className={ui.input} value={setup.name} maxLength={60}
              placeholder="e.g. Delhi Public School" onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div>
            <span className={ui.label}>School hours</span>
            <div className={styles.hours}>
              <input type="time" className={ui.input} value={toTimeInput(setup.start)} aria-label="School starts"
                onChange={(e) => e.target.value && set({ start: fromTimeInput(e.target.value) })} />
              <span>to</span>
              <input type="time" className={ui.input} value={toTimeInput(setup.end)} aria-label="School ends"
                onChange={(e) => e.target.value && set({ end: fromTimeInput(e.target.value) })} />
            </div>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <PlaceSearch value={setup.place} onChange={(place) => set({ place })} label="Campus location" />
        </div>
      </section>

      <section className={ui.card}>
        <h3 className={ui.cardTitle}>Classes</h3>
        <p className={ui.cardSub}>
          Only the number of children with asthma, never names. Those classes get a stricter note on bad-air days.
        </p>
        <ul className={styles.rows}>
          {setup.classes.map((c) => (
            <li key={c.id} className={styles.classRow}>
              <input className={ui.input} value={c.name} maxLength={20} aria-label="Class name"
                onChange={(e) => setClass(c.id, { name: e.target.value })} />
              <select className={ui.input} value={c.age} aria-label={`Age group for ${c.name}`}
                onChange={(e) => setClass(c.id, { age: e.target.value as AgeGroup })}>
                {(Object.keys(AGE_LABEL) as AgeGroup[]).map((a) => (
                  <option key={a} value={a}>
                    {AGE_LABEL[a]}
                  </option>
                ))}
              </select>
              <label className={styles.inline}>
                <input type="number" className={ui.input} min={0} max={60} value={c.asthma}
                  aria-label={`Children with asthma in ${c.name}`}
                  onChange={(e) => setClass(c.id, { asthma: Math.max(0, Math.min(60, Number(e.target.value) || 0)) })} />
                <span>with asthma</span>
              </label>
              <button type="button" className={styles.remove} aria-label={`Remove ${c.name}`}
                disabled={setup.classes.length === 1}
                onClick={() => set({
                  classes: setup.classes.filter((x) => x.id !== c.id),
                  timetable: setup.timetable.filter((t) => t.class_id !== c.id),
                })}>
                ✕
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className={ui.btnSmall}
          onClick={() => set({ classes: [...setup.classes, { id: newId("c"), name: "New class", age: "6-10", asthma: 0 }] })}>
          + Add a class
        </button>
      </section>

      <section className={ui.card}>
        <h3 className={ui.cardTitle}>Weekly outdoor timetable</h3>
        <p className={ui.cardSub}>Only the periods that happen outside. Tap the days each one runs.</p>
        <ul className={styles.rows}>
          {sorted.map((t) => (
            <li key={t.id} className={styles.entryRow}>
              <div className={styles.days} role="group" aria-label="Days">
                {DAYS.map((d, i) => (
                  <button key={d} type="button" aria-pressed={t.days.includes(i + 1)}
                    onClick={() => setEntry(t.id, {
                      days: t.days.includes(i + 1) ? t.days.filter((x) => x !== i + 1) : [...t.days, i + 1].sort(),
                    })}>
                    {d[0]}
                    <span className="visually-hidden">{d}</span>
                  </button>
                ))}
              </div>
              <select className={ui.input} value={t.class_id} aria-label="Class"
                onChange={(e) => setEntry(t.id, { class_id: e.target.value })}>
                <option value="all">Whole school</option>
                {setup.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select className={ui.input} value={t.kind} aria-label="Activity"
                onChange={(e) => setEntry(t.id, { kind: e.target.value as Kind })}>
                {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
              <input type="time" className={ui.input} value={toTimeInput(t.start)} aria-label="Starts at"
                onChange={(e) => e.target.value && setEntry(t.id, { start: fromTimeInput(e.target.value) })} />
              <label className={styles.inline}>
                <input type="number" className={ui.input} min={10} max={180} step={5} value={t.minutes}
                  aria-label="Minutes"
                  onChange={(e) => setEntry(t.id, { minutes: Math.max(10, Math.min(180, Number(e.target.value) || 10)) })} />
                <span>min</span>
              </label>
              <button type="button" className={styles.remove} aria-label="Remove this period"
                onClick={() => set({ timetable: setup.timetable.filter((x) => x.id !== t.id) })}>
                ✕
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className={ui.btnSmall}
          onClick={() => set({
            timetable: [...setup.timetable,
              { id: newId("t"), days: [1, 3, 5], class_id: setup.classes[0]?.id ?? "all", kind: "pe", start: 10 * 60, minutes: 40 }],
          })}>
          + Add a period
        </button>

        <ImportBox setup={setup} onImport={(classes, timetable) => set({ classes, timetable })} />
      </section>

      <div className={styles.doneRow}>
        <span className={styles.saved}>Saved on this device</span>
        <button type="button" className={ui.btn} onClick={onDone} disabled={!setup.place}>
          {setup.place ? "Check today's plan →" : "Add the campus location first"}
        </button>
      </div>
    </div>
  );
}

function ImportBox({ setup, onImport }: {
  setup: SchoolSetup;
  onImport: (classes: SchoolClass[], timetable: TimetableEntry[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  function run(replace: boolean) {
    const r = parseTimetable(text, setup.classes);
    if (!r.timetable.length) {
      setMsg(r.errors[0] ?? "Nothing to import.");
      return;
    }
    onImport(r.classes, replace ? r.timetable : [...setup.timetable, ...r.timetable]);
    setMsg(`Imported ${r.timetable.length} period${r.timetable.length > 1 ? "s" : ""}.` +
      (r.errors.length ? ` Skipped ${r.errors.length} line${r.errors.length > 1 ? "s" : ""}.` : ""));
    setText("");
  }

  return (
    <div className={styles.import}>
      <button type="button" className={styles.link} onClick={() => setOpen((o) => !o)}>
        {open ? "Hide import" : "Paste from Excel or CSV instead"}
      </button>
      {open && (
        <>
          <p className={styles.help}>
            One period per line: <code>days, class, activity, start, minutes</code>. For example{" "}
            <code>Mon/Wed/Fri, 5B, PE, 12:00, 40</code> or <code>Daily, All, Assembly, 08:00, 20</code>. New class names
            are added automatically.
          </p>
          <textarea className={ui.input} rows={5} value={text} onChange={(e) => setText(e.target.value)}
            placeholder={"Mon/Wed/Fri, 5B, PE, 12:00, 40\nDaily, All, Recess, 11:00, 30"} />
          <div className={styles.row}>
            <button type="button" className={ui.btnSmall} onClick={() => run(false)} disabled={!text.trim()}>
              Add to timetable
            </button>
            <button type="button" className={ui.btnSmall} onClick={() => run(true)} disabled={!text.trim()}>
              Replace timetable
            </button>
          </div>
        </>
      )}
      {msg && <p className={styles.help}>{msg}</p>}
      <p className={styles.help}>
        {setup.timetable.reduce((n, t) => n + t.days.length, 0)} outdoor periods a week.
      </p>
    </div>
  );
}
