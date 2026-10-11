"use client";

import { useId } from "react";
import styles from "./Segmented.module.css";

export interface Option<T extends string | number> {
  value: T;
  label: string;
  sub?: string;
}

/** A row of chunky chips that behaves like a radio group. */
export default function Segmented<T extends string | number>({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  const name = useId();
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>
        {label}
        {hint && <span className={styles.hint}>{hint}</span>}
      </legend>
      <div className={styles.row}>
        {options.map((o) => (
          <label key={String(o.value)} className={styles.chip} data-on={o.value === value || undefined}>
            <input
              type="radio"
              name={name}
              className="visually-hidden"
              checked={o.value === value}
              onChange={() => onChange(o.value)}
            />
            <span className={styles.text}>{o.label}</span>
            {o.sub && <span className={styles.sub}>{o.sub}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
