"use client";

import { useEffect, useState } from "react";
import { prettyDate } from "@/lib/format";
import { loadSetup, sampleSetup, saveSetup, type SchoolSetup } from "@/lib/school";
import type { SchoolDay } from "@/lib/types";
import Chiku, { type Mood } from "../Chiku";
import PlaceSearch from "../PlaceSearch";
import Scene, { type Sky } from "../Scene";
import ui from "../ui.module.css";
import stage from "../ParentExperience.module.css";
import guide from "../ChikuGuide.module.css";
import EventFinder from "./EventFinder";
import TimetableSetup from "./TimetableSetup";
import TodayView from "./TodayView";
import styles from "./School.module.css";

type Tab = "today" | "timetable" | "events";

function look(day: SchoolDay | null): { mood: Mood; sky: Sky } {
  if (!day) return { mood: "careful", sky: "clear" };
  if (day.advisory) return { mood: "masked", sky: "smog" };
  const worst = Math.max(0, ...day.periods.map((p) => p.level));
  const heat = day.periods.some((p) => p.level === worst && p.drivers.includes("heat") && !p.drivers.includes("air"));
  if (worst === 0) return { mood: "happy", sky: "clear" };
  if (heat) return { mood: "hot", sky: "hot" };
  return { mood: worst >= 2 ? "masked" : "careful", sky: worst >= 2 ? "smog" : "hazy" };
}

export default function SchoolWorkspace() {
  const [setup, setSetup] = useState<SchoolSetup | null>(null);
  const [tab, setTab] = useState<Tab>("today");
  const [day, setDay] = useState<SchoolDay | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const s = loadSetup();
    setSetup(s ?? sampleSetup());
    if (s && !s.place) setTab("timetable");
  }, []);

  function update(s: SchoolSetup) {
    setSetup(s);
    saveSetup(s);
  }

  if (!setup) return null;
  const started = setup.ready;
  const { mood, sky } = look(day);
  const n = day?.periods.length ?? 0;
  const changed = day ? n - day.counts.go : 0;

  return (
    <>
      <section className={stage.stage} style={{ minHeight: 420 }}>
        <Scene sky={sky} />
        <div className={stage.inner}>
          <div className={stage.chiku}>
            <Chiku mood={busy ? "thinking" : mood} size={200} />
          </div>
          <div className={stage.talk}>
            <div className={guide.bubble} aria-live="polite">
              {!started ? (
                <>
                  <p className={guide.say}>
                    Namaste! Set up your timetable once, and every morning I&apos;ll tell you what each outdoor period
                    should do.
                  </p>
                  <p className={guide.small}>Made for timetables that stay the same week to week.</p>
                </>
              ) : busy && !day ? (
                <p className={guide.say}>Checking every outdoor period against the forecast…</p>
              ) : day && tab === "today" ? (
                <div className={guide.verdict}>
                  <p className={ui.eyebrow}>
                    {setup.name || "Your school"} · {prettyDate(day.date)}
                  </p>
                  <h2 className={guide.headline}>
                    {day.advisory
                      ? "Advisory day: everything moves indoors."
                      : changed === 0
                        ? "All outdoor periods can go ahead as usual."
                        : `${changed} of ${n} outdoor periods need a different activity.`}
                  </h2>
                  <p className={guide.small}>
                    Peak AQI {day.day_aqi.peak} ({day.day_aqi.peak_cat}, mostly {day.day_aqi.dominant})
                    {day.swaps.length ? ` · ${day.swaps.length} PE swap${day.swaps.length > 1 ? "s" : ""} suggested` : ""}
                  </p>
                </div>
              ) : (
                <p className={guide.say}>
                  {tab === "timetable"
                    ? "Tell me about your school and its outdoor periods. You only do this once."
                    : tab === "events"
                      ? "Planning something outdoors? I'll find the best day and time."
                      : "Pick a day to see the plan."}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className={styles.below}>
        {!started ? (
          <SetupGate setup={setup} onStart={(s) => {
            update(s);
            setTab("timetable");
          }} />
        ) : (
          <>
            <div className={styles.tabBar}>
              <nav className={styles.tabs} aria-label="School sections">
                {([["today", "Daily plan"], ["timetable", "Timetable"], ["events", "Event day finder"]] as const).map(
                  ([id, label]) => (
                    <button key={id} type="button" aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>
                      {label}
                    </button>
                  ),
                )}
              </nav>
              <span className={styles.school}>{setup.name}</span>
            </div>

            {tab === "today" && setup.place && (
              <TodayView setup={setup} onResult={setDay} onBusy={setBusy} onEditTimetable={() => setTab("timetable")} />
            )}
            {tab === "today" && !setup.place && (
              <p className={styles.empty}>
                Add your campus location in the{" "}
                <button type="button" className={styles.link} onClick={() => setTab("timetable")}>
                  timetable
                </button>{" "}
                first.
              </p>
            )}
            {tab === "timetable" && (
              <TimetableSetup setup={setup} onChange={update} onDone={() => setTab("today")} />
            )}
            {tab === "events" && <EventFinder setup={setup} />}
          </>
        )}
      </div>
    </>
  );
}

function SetupGate({ setup, onStart }: { setup: SchoolSetup; onStart: (s: SchoolSetup) => void }) {
  const [name, setName] = useState(setup.name);
  const [place, setPlace] = useState(setup.place);
  return (
    <form
      className={`${ui.card} ${styles.gate}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim() && place) onStart({ ...setup, name: name.trim(), place, ready: true });
      }}
    >
      <div>
        <h2>Set up your school</h2>
        <ul className={styles.perks}>
          <li>Your weekly timetable, set up once</li>
          <li>A daily plan for every outdoor period, with what to do instead</li>
          <li>PE swaps between classes when they help</li>
          <li>Morning bulletin PDF, email and WhatsApp in English and Hindi</li>
          <li>Event day finder for matches and sports day</li>
        </ul>
      </div>
      <div className={styles.gateForm}>
        <label>
          <span className={ui.label}>School name</span>
          <input className={ui.input} value={name} maxLength={60} required placeholder="e.g. Delhi Public School"
            onChange={(e) => setName(e.target.value)} />
        </label>
        <PlaceSearch value={place} onChange={setPlace} label="Campus location" />
        <button className={ui.btn} disabled={!name.trim() || !place}>
          Continue
        </button>
        <p className={styles.help}>We&apos;ve filled in a sample timetable you can edit. Everything stays on this device.</p>
      </div>
    </form>
  );
}
