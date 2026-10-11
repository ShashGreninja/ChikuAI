"use client";

import { useEffect, useState } from "react";
import { getNow, type AirNow } from "@/lib/api";
import type { Place } from "@/lib/types";
import styles from "./AirSign.module.css";

function band(aqi: number): "good" | "ok" | "moderate" | "poor" | "bad" {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "ok";
  if (aqi <= 200) return "moderate";
  if (aqi <= 300) return "poor";
  return "bad";
}

/** A little park signboard with the air at the chosen place right now. */
export default function AirSign({ place }: { place: Place | null | undefined }) {
  const [now, setNow] = useState<AirNow | null>(null);

  useEffect(() => {
    setNow(null);
    if (!place) return;
    let stale = false;
    getNow(place.lat, place.lon)
      .then((n) => !stale && setNow(n))
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [place]);

  return (
    <aside className={styles.sign} aria-label="Air right now">
      <div className={styles.board}>
        <span className={styles.title}>Air right now</span>
        {place && now ? (
          <>
            <span className={styles.place}>{place.name}</span>
            <div className={styles.aqi} data-band={band(now.aqi)}>
              <b>{now.aqi}</b>
              <span>
                AQI
                <br />
                {now.aqi_cat}
              </span>
            </div>
            <span className={styles.meta}>
              mostly {now.dominant} · {now.temp}°C, feels {now.feels}°
            </span>
          </>
        ) : place ? (
          <span className={styles.meta}>Checking {place.name}…</span>
        ) : (
          <span className={styles.meta}>Tell Chiku your city to see it here</span>
        )}
      </div>
      <span className={styles.posts} aria-hidden />
    </aside>
  );
}
