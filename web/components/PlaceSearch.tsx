"use client";

import { useEffect, useRef, useState } from "react";
import { searchPlaces } from "@/lib/api";
import type { Place } from "@/lib/types";
import ui from "./ui.module.css";
import styles from "./PlaceSearch.module.css";

const QUICK: Place[] = [
  { name: "New Delhi", region: "Delhi", lat: 28.6139, lon: 77.209 },
  { name: "Mumbai", region: "Maharashtra", lat: 19.076, lon: 72.8777 },
  { name: "Bengaluru", region: "Karnataka", lat: 12.9716, lon: 77.5946 },
  { name: "Kolkata", region: "West Bengal", lat: 22.5726, lon: 88.3639 },
  { name: "Patna", region: "Bihar", lat: 25.5941, lon: 85.1376 },
];

export default function PlaceSearch({ value, onChange, label = "Where?", compact = false }: {
  value: Place | null;
  onChange: (p: Place) => void;
  label?: string;
  /** Inside Chiku's bubble: the question is the label, so hide ours and always show quick picks. */
  compact?: boolean;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = "place-results";

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      searchPlaces(q.trim(), ctrl.signal)
        .then((r) => {
          setResults(r);
          setActive(0);
          setOpen(true);
        })
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function choose(p: Place) {
    onChange(p);
    setQ("");
    setOpen(false);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoError("Location isn't available in this browser.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        choose({
          name: "My location",
          region: `${pos.coords.latitude.toFixed(2)}°N, ${pos.coords.longitude.toFixed(2)}°E`,
          lat: Number(pos.coords.latitude.toFixed(4)),
          lon: Number(pos.coords.longitude.toFixed(4)),
        });
      },
      () => {
        setLocating(false);
        setGeoError("Couldn't get your location. Search for your city instead.");
      },
      { timeout: 10000 },
    );
  }

  function onKey(e: React.KeyboardEvent) {
    if (!open || !results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={styles.wrap} ref={boxRef}>
      <label className={compact ? "visually-hidden" : ui.label} htmlFor="place-input">
        {label}
      </label>

      {value && !compact && (
        <div className={styles.current}>
          <span className={styles.pin} aria-hidden>
            📍
          </span>
          <span>
            <strong>{value.name}</strong>
            {value.region && <span className={styles.region}>, {value.region}</span>}
          </span>
        </div>
      )}

      <div className={styles.row}>
        <div className={styles.field}>
          <input
            id="place-input"
            className={ui.input}
            placeholder={value ? "Change city or locality…" : "Search your city or locality…"}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            onKeyDown={onKey}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
          />
          {open && results.length > 0 && (
            <ul id={listId} role="listbox" className={styles.list}>
              {results.map((p, i) => (
                <li
                  key={`${p.lat},${p.lon}`}
                  role="option"
                  aria-selected={i === active}
                  className={styles.option}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(p);
                  }}
                  onMouseEnter={() => setActive(i)}
                >
                  <strong>{p.name}</strong> <span className={styles.region}>{p.region}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="button" className={ui.btnSmall} onClick={useMyLocation} disabled={locating}>
          {locating ? "Finding you…" : "Use my location"}
        </button>
      </div>

      {geoError && <p className={styles.geoError}>{geoError}</p>}

      {(!value || compact) && (
        <div className={styles.quick}>
          {QUICK.map((p) => (
            <button key={p.name} type="button" className={styles.quickBtn} onClick={() => choose(p)}>
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
