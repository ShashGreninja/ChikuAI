"use client";

import { useEffect, useState } from "react";
import { checkSchoolDay, downloadBulletin, emailBulletin, type BulletinQuery } from "@/lib/api";
import { clock, prettyDate } from "@/lib/format";
import { DAYS, periodsFor, staffMessage, weekday, type SchoolSetup } from "@/lib/school";
import type { SchoolDay } from "@/lib/types";
import DayStrip, { type Marker } from "../DayStrip";
import DownloadButton from "../DownloadButton";
import EmailForm from "../EmailForm";
import Icon from "../Icon";
import ShareBox from "../ShareBox";
import StatusBadge from "../StatusBadge";
import ui from "../ui.module.css";
import styles from "./School.module.css";

const DRIVER: Record<string, string> = { air: "air", heat: "heat", advisory: "govt. advisory" };

export default function TodayView({ setup, onResult, onBusy, onEditTimetable }: {
  setup: SchoolSetup;
  onResult: (d: SchoolDay | null) => void;
  onBusy: (b: boolean) => void;
  onEditTimetable: () => void;
}) {
  const [day, setDay] = useState<"today" | "tomorrow">(() => (new Date().getHours() >= 15 ? "tomorrow" : "today"));
  const [advisory, setAdvisory] = useState(false);
  const [result, setResult] = useState<SchoolDay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const wd = weekday(day);
  const periods = periodsFor(setup, wd);
  const place = setup.place;

  const query: BulletinQuery | null =
    place && periods.length
      ? {
          lat: place.lat, lon: place.lon, day, advisory, school_start: setup.start, school_end: setup.end,
          classes: setup.classes, periods, place: place.name, school_name: setup.name || "our school",
        }
      : null;
  const key = JSON.stringify(query);

  useEffect(() => {
    if (!query) {
      setResult(null);
      onResult(null);
      return;
    }
    let stale = false;
    setLoading(true);
    onBusy(true);
    setError(null);
    checkSchoolDay(query)
      .then((r) => {
        if (stale) return;
        setResult(r);
        onResult(r);
      })
      .catch((e) => !stale && setError(e.message))
      .finally(() => {
        if (!stale) {
          setLoading(false);
          onBusy(false);
        }
      });
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const markers: Marker[] = result
    ? [...new Map(result.periods.map((p) => [p.start, p])).values()].map((p) => ({
        start: p.start,
        end: p.end,
        label: p.class_id === "all" ? p.kind_label.split(" ")[0] : p.class_name,
        kind: "slot",
      }))
    : [];

  return (
    <div className={styles.stack}>
      <div className={styles.controls}>
        <span className={styles.seg} role="group" aria-label="Which day">
          {(["today", "tomorrow"] as const).map((d) => (
            <button key={d} type="button" aria-pressed={day === d} onClick={() => setDay(d)}>
              {d === "today" ? "Today" : "Tomorrow"}
              <small>{DAYS[weekday(d) - 1] ?? "Sun"}</small>
            </button>
          ))}
        </span>
        <label className={styles.advisory}>
          <input type="checkbox" checked={advisory} onChange={(e) => setAdvisory(e.target.checked)} />
          <span>
            <b>Government advisory in force</b>
            <small>e.g. GRAP or a heatwave order. Moves all outdoor activity indoors.</small>
          </span>
        </label>
      </div>

      {wd === 7 && <p className={styles.empty}>No school on Sunday. Switch to the other day.</p>}
      {wd !== 7 && !periods.length && (
        <p className={styles.empty}>
          No outdoor periods on {DAYS[wd - 1]}.{" "}
          <button type="button" className={styles.link} onClick={onEditTimetable}>
            Add some in the timetable
          </button>
        </p>
      )}
      {error && (
        <p className={ui.error} role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className={styles.stack} data-loading={loading || undefined}>
          <div className={styles.stats}>
            <Stat value={result.counts.go} label="as usual" tone="go" />
            <Stat value={result.periods.length - result.counts.go} label="need a different activity" tone="limit" />
            <Stat value={result.swaps.length} label="PE swaps suggested" tone="neutral" />
            <Stat value={result.asthma_notes} label="asthma notes" tone="neutral" />
          </div>

          <section className={ui.card}>
            <h3 className={ui.cardTitle}>
              {day === "today" ? "Today" : "Tomorrow"}, {prettyDate(result.date)}
            </h3>
            <p className={ui.cardSub}>
              Every period stays at its time. Chiku tells you what to do in it.
            </p>
            <ul className={styles.periods}>
              {result.periods.map((p) => (
                <li key={p.id} className={styles.period} data-status={p.status.key}>
                  <div className={styles.when}>
                    <b>{clock(p.start)}</b>
                    <span>{p.minutes} min</span>
                  </div>
                  <div className={styles.what}>
                    <span className={styles.cls}>{p.class_id === "all" ? "Whole school" : p.class_name}</span>
                    <b>{p.kind_label}</b>
                  </div>
                  <StatusBadge status={p.status.key} size="sm" />
                  <div className={styles.todo}>
                    <b>{p.action}</b>
                    <span className={styles.why}>
                      {p.drivers.length ? p.drivers.map((d) => DRIVER[d]).join(" and ") : "all clear"} · AQI {p.aqi},
                      WBGT {p.wbgt}°
                    </span>
                    {p.asthma && (
                      <span className={styles.asthma}>
                        <Icon name="inhaler" size={16} /> {p.asthma.count} with asthma: {p.asthma.action.toLowerCase()}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {result.swaps.length > 0 && (
            <section className={ui.card}>
              <h3 className={ui.cardTitle}>Suggested PE swaps</h3>
              <p className={ui.cardSub}>
                Two classes trade PE slots, along with the subjects in them. The ground and PE teacher are used exactly as
                before.
              </p>
              <ul className={styles.swaps}>
                {result.swaps.map((s) => (
                  <li key={`${s.a.id}-${s.b.id}`}>
                    {[s.a, s.b].map((side) => (
                      <div key={side.id} className={styles.swapSide}>
                        <b>{side.class_name}</b>
                        <span>
                          {side.from} → {side.to}
                        </span>
                        <span className={styles.swapStatus}>
                          <StatusBadge status={side.before.key} size="sm" /> →{" "}
                          <StatusBadge status={side.after.key} size="sm" />
                        </span>
                      </div>
                    ))}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className={ui.card}>
            <h3 className={ui.cardTitle}>The school day, hour by hour</h3>
            <p className={ui.cardSub}>Boxes mark when outdoor periods happen. The bracket marks school hours.</p>
            <DayStrip
              hours={result.hours}
              from={6}
              to={Math.min(20, Math.ceil(setup.end / 60) + 2)}
              markers={markers}
              band={{ start: setup.start, end: setup.end, label: "school hours" }}
            />
          </section>

          {query && (
            <ShareBox
              title="Morning bulletin"
              sub="Post it in the staff group, print it for the notice board, or email it."
              build={(lang) => staffMessage(result, setup.name || "our school", lang)}
              actions={<DownloadButton make={() => downloadBulletin(query)} label="Bulletin PDF" />}
            >
              <EmailForm
                label="Email the bulletin"
                subject={`Outdoor plan for ${setup.name || "our school"}, ${prettyDate(result.date)}`}
                body={staffMessage(result, setup.name || "our school", "en")}
                send={(to) => emailBulletin(query, to, staffMessage(result, setup.name || "our school", "en"))}
                download={() => downloadBulletin(query)}
              />
            </ShareBox>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div className={styles.stat} data-tone={tone}>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}
