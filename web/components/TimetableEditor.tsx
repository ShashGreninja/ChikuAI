"use client";

import { fromTimeInput, toTimeInput } from "@/lib/format";
import type { SchoolActivity, SchoolSlot } from "@/lib/types";
import ui from "./ui.module.css";
import styles from "./TimetableEditor.module.css";

const ACTIVITY_LABEL: Record<SchoolActivity, string> = {
  pe: "PE / games",
  sports: "Sports practice",
  recess: "Recess",
  assembly: "Assembly",
  walk: "Nature walk",
};

let nextId = 100;

export default function TimetableEditor({ slots, onChange }: {
  slots: SchoolSlot[];
  onChange: (s: SchoolSlot[]) => void;
}) {
  const update = (id: string, patch: Partial<SchoolSlot>) =>
    onChange(slots.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  return (
    <fieldset className={styles.box}>
      <legend className={ui.label}>
        Outdoor periods<span className={ui.hint}>as they are on the timetable</span>
      </legend>

      <ol className={styles.list}>
        {slots.map((s, i) => (
          <li key={s.id} className={styles.row}>
            <span className={styles.num} aria-hidden>
              {i + 1}
            </span>
            <div className={styles.fields}>
              <input
                className={`${ui.input} ${styles.name}`}
                value={s.name}
                maxLength={40}
                onChange={(e) => update(s.id, { name: e.target.value })}
                aria-label={`Name of period ${i + 1}`}
              />
              <select
                className={ui.input}
                value={s.activity}
                onChange={(e) => update(s.id, { activity: e.target.value as SchoolActivity })}
                aria-label={`Activity for ${s.name}`}
              >
                {Object.entries(ACTIVITY_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <input
                type="time"
                className={ui.input}
                value={toTimeInput(s.start)}
                step={300}
                onChange={(e) => e.target.value && update(s.id, { start: fromTimeInput(e.target.value) })}
                aria-label={`Start time for ${s.name}`}
              />
              <label className={styles.mins}>
                <input
                  type="number"
                  className={ui.input}
                  min={10}
                  max={120}
                  step={5}
                  value={s.minutes}
                  onChange={(e) => update(s.id, { minutes: Math.max(10, Math.min(120, Number(e.target.value) || 10)) })}
                  aria-label={`Minutes for ${s.name}`}
                />
                <span>min</span>
              </label>
              <label className={styles.move}>
                <input type="checkbox" checked={s.movable} onChange={(e) => update(s.id, { movable: e.target.checked })} />
                can move
              </label>
            </div>
            <button
              type="button"
              className={styles.remove}
              onClick={() => onChange(slots.filter((x) => x.id !== s.id))}
              disabled={slots.length === 1}
              aria-label={`Remove ${s.name}`}
            >
              ✕
            </button>
          </li>
        ))}
      </ol>

      {slots.length < 8 && (
        <button
          type="button"
          className={ui.btnSmall}
          onClick={() =>
            onChange([
              ...slots,
              { id: String(nextId++), name: "Games period", activity: "pe", start: 10 * 60, minutes: 40, movable: true },
            ])
          }
        >
          + Add a period
        </button>
      )}
    </fieldset>
  );
}
