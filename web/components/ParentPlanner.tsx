"use client";

import { useEffect, useState } from "react";
import { getParentPlan, type ParentQuery } from "@/lib/api";
import { clock, toTimeInput, fromTimeInput } from "@/lib/format";
import { parentMessage } from "@/lib/messages";
import { moodFor } from "@/lib/mood";
import { useStored } from "@/lib/useStored";
import type { Activity, AgeGroup, Day, ParentPlan, Place } from "@/lib/types";
import AskChiku from "./AskChiku";
import Chiku from "./Chiku";
import DayStrip, { type Marker } from "./DayStrip";
import ExposureBars from "./ExposureBars";
import PlaceSearch from "./PlaceSearch";
import Segmented from "./Segmented";
import ShareBox from "./ShareBox";
import VerdictCard from "./VerdictCard";
import WhyPanel from "./WhyPanel";
import ui from "./ui.module.css";
import styles from "./Planner.module.css";

const USUAL_TIMES = Array.from({ length: 27 }, (_, i) => 6 * 60 + i * 30); // 6:00 → 19:00

export default function ParentPlanner() {
  const [place, setPlace] = useStored<Place | null>("bk.place", null);
  const [age, setAge] = useStored<AgeGroup>("bk.age", "6-10");
  const [asthma, setAsthma] = useStored<boolean>("bk.asthma", false);
  const [activity, setActivity] = useState<Activity>("play");
  const [minutes, setMinutes] = useState(60);
  const [day, setDay] = useState<Day>("today");
  const [usual, setUsual] = useState(17 * 60);

  const [plan, setPlan] = useState<ParentPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!place) return;
    const q: ParentQuery = { lat: place.lat, lon: place.lon, age, activity, minutes, asthma, day, usual };
    let stale = false;
    setLoading(true);
    setError(null);
    const t = setTimeout(() => {
      getParentPlan(q)
        .then((p) => !stale && setPlan(p))
        .catch((e) => !stale && setError(e.message))
        .finally(() => !stale && setLoading(false));
    }, 200);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [place, age, activity, minutes, asthma, day, usual]);

  return (
    <div className={styles.layout} data-answer-first={(place && plan) || undefined}>
      <aside className={`${ui.card} ${styles.form}`} aria-label="Tell Chiku about the outing">
        <PlaceSearch value={place} onChange={setPlace} />

        <Segmented<AgeGroup>
          label="Who's going out?"
          options={[
            { value: "3-5", label: "3–5 yrs" },
            { value: "6-10", label: "6–10 yrs" },
            { value: "11-15", label: "11–15 yrs" },
          ]}
          value={age}
          onChange={setAge}
        />

        <label className={styles.switch}>
          <input type="checkbox" checked={asthma} onChange={(e) => setAsthma(e.target.checked)} />
          <span className={styles.knob} aria-hidden />
          <span>
            <b>Asthma or breathing trouble</b>
            <span className={styles.switchSub}>Chiku gets stricter about air</span>
          </span>
        </label>

        <Segmented<Activity>
          label="Doing what?"
          options={[
            { value: "play", label: "Park play", sub: "running around" },
            { value: "cycling", label: "Cycling", sub: "steady effort" },
            { value: "sports", label: "Sports", sub: "cricket, football" },
            { value: "walk", label: "Walk", sub: "easy pace" },
          ]}
          value={activity}
          onChange={setActivity}
        />

        <Segmented<number>
          label="For how long?"
          options={[30, 60, 90, 120].map((m) => ({ value: m, label: m < 60 ? `${m} min` : `${m / 60} hr${m > 60 ? "s" : ""}` }))}
          value={minutes}
          onChange={setMinutes}
        />

        <div className={styles.twoUp}>
          <Segmented<Day>
            label="When?"
            options={[
              { value: "today", label: "Today" },
              { value: "tomorrow", label: "Tomorrow" },
            ]}
            value={day}
            onChange={setDay}
          />
          <div>
            <label className={ui.label} htmlFor="usual">
              Usual time
            </label>
            <select
              id="usual"
              className={ui.input}
              value={toTimeInput(usual)}
              onChange={(e) => setUsual(fromTimeInput(e.target.value))}
            >
              {USUAL_TIMES.map((m) => (
                <option key={m} value={toTimeInput(m)}>
                  {clock(m)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </aside>

      <div className={styles.results}>
        {!place && (
          <div className={styles.empty}>
            <Chiku mood="happy" size={150} />
            <div>
              <h2>Namaste! I&apos;m Chiku.</h2>
              <p>
                Tell me your city and I&apos;ll find the hour when the air is cleanest and the heat is gentlest for your
                child to play outside.
              </p>
            </div>
          </div>
        )}

        {place && loading && !plan && (
          <div className={styles.empty}>
            <Chiku mood="thinking" size={130} />
            <p>Reading the sky over {place.name}…</p>
          </div>
        )}

        {error && (
          <p className={ui.error} role="alert">
            {error}
          </p>
        )}

        {place && plan && (
          <div className={styles.stack} data-loading={loading || undefined}>
            <VerdictCard plan={plan} place={place.name} mood={moodFor(plan.pick, plan.hours)} />

            <section className={ui.card}>
              <h3 className={ui.cardTitle}>
                {plan.day === "today" ? "Today" : "Tomorrow"}, hour by hour
              </h3>
              <p className={ui.cardSub}>
                Hover or tab through the hours for AQI and heat. Daily peak AQI (CPCB method):{" "}
                <b>
                  {plan.day_aqi.peak} {plan.day_aqi.peak_cat}
                </b>{" "}
                around {clock(plan.day_aqi.peak_hour * 60)}, mostly {plan.day_aqi.dominant}.
              </p>
              <DayStrip hours={plan.hours} nowMin={plan.now_min} markers={markersFor(plan)} />
            </section>

            <ExposureCard plan={plan} />

            <WhyPanel plan={plan} />

            <ShareBox
              title="Send it to the family group"
              sub="Grandparents, the driver, the coach — everyone on the same page."
              build={(lang) => parentMessage(plan, place.name, lang)}
            />

            <AskChiku
              context={{ place: place.name, lat: place.lat, lon: place.lon, age, asthma, day }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function markersFor(plan: ParentPlan): Marker[] {
  const out: Marker[] = [];
  if (plan.usual && (!plan.pick || plan.usual.start !== plan.pick.start)) {
    out.push({ start: plan.usual.start, end: plan.usual.end, label: "usual", kind: "usual" });
  }
  if (plan.pick) out.push({ start: plan.pick.start, end: plan.pick.end, label: "Chiku's pick", kind: "pick" });
  return out;
}

function ExposureCard({ plan }: { plan: ParentPlan }) {
  const { pick, usual, worst } = plan;
  if (!pick) return null;

  const rows = [
    { key: "pick", label: "Chiku's pick", when: pick.label, dose: pick.dose, pm25: pick.pm25_ug, highlight: true },
  ];
  if (usual && usual.start !== pick.start)
    rows.push({ key: "usual", label: "Usual time", when: usual.label, dose: usual.dose, pm25: usual.pm25_ug, highlight: false });
  if (worst && worst.start !== pick.start && worst.start !== usual?.start)
    rows.push({ key: "worst", label: "Worst time", when: worst.label, dose: worst.dose, pm25: worst.pm25_ug, highlight: false });

  const saved = plan.saved_vs_usual_pct;
  let headline: React.ReactNode;
  if (usual && usual.start === pick.start) {
    headline = <>Your usual time is already the best one. Nice.</>;
  } else if (saved !== null && saved > 0) {
    headline = (
      <>
        <span className={styles.big}>{saved}%</span> less pollution in their lungs than going at {usual?.start_label}
      </>
    );
  } else if (usual) {
    const cooler = Math.round((usual.wbgt - pick.wbgt) * 10) / 10;
    headline = cooler > 0 ? (
      <>
        About the same air as {usual.start_label}, but <span className={styles.big}>{cooler}°C</span> less heat stress
      </>
    ) : (
      <>The air is similar all day. Chiku picked the gentlest slot.</>
    );
  }

  return (
    <section className={ui.card}>
      <h3 className={ui.cardTitle}>What the timing changes</h3>
      <p className={styles.exposureHead}>{headline}</p>
      <ExposureBars
        rows={rows}
        caption={`Pollution dose for ${plan.profile.minutes} min of ${plan.profile.activity.toLowerCase()}, counted in litres of air at India's legal limit. Hover a bar for PM2.5 in micrograms.`}
      />
    </section>
  );
}
