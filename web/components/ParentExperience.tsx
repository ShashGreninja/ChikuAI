"use client";

import { useCallback, useEffect, useState } from "react";
import { getHealth, getNarration, getParentPlan, type ParentQuery } from "@/lib/api";
import { isComplete, nextStep, type Answers, type StepId } from "@/lib/answers";
import { moodFor, skyFor } from "@/lib/mood";
import type { Narration, ParentPlan } from "@/lib/types";
import AirSign from "./AirSign";
import Chiku, { type Mood } from "./Chiku";
import ChikuGuide, { type Phase } from "./ChikuGuide";
import PlanDashboard from "./PlanDashboard";
import Scene, { type Sky } from "./Scene";
import styles from "./ParentExperience.module.css";

const STORE = "bk.answers.v2";

function load(): Answers {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? "{}") as Answers;
  } catch {
    return {};
  }
}

function save(a: Answers) {
  try {
    localStorage.setItem(STORE, JSON.stringify(a));
  } catch {}
}

function toQuery(a: Required<Answers>): ParentQuery {
  return {
    lat: a.place.lat, lon: a.place.lon, age: a.age, activity: a.activity,
    minutes: a.minutes, asthma: a.asthma, day: a.day, usual: a.usual,
  };
}

export default function ParentExperience() {
  const [answers, setAnswers] = useState<Answers>({});
  const [phase, setPhase] = useState<Phase>("ask");
  const [editing, setEditing] = useState<StepId | null>(null);
  const [plan, setPlan] = useState<ParentPlan | null>(null);
  const [narration, setNarration] = useState<Narration | null>(null);
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [agentEnabled, setAgentEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const a = load();
    setAnswers(a);
    if (isComplete(a)) setPhase("welcome");
    getHealth().then((h) => setAgentEnabled(h.agent)).catch(() => {});
  }, []);

  const run = useCallback(async (a: Answers, l: "en" | "hi" = lang) => {
    if (!isComplete(a)) return;
    setPhase("thinking");
    setError(null);
    const q = toQuery(a);
    try {
      const started = Date.now();
      const [p, n] = await Promise.all([
        getParentPlan(q),
        getNarration(q, a.name ?? null, l).catch(() => null),
      ]);
      // let Chiku "think" for a beat; an instant answer feels less considered
      await new Promise((r) => setTimeout(r, Math.max(0, 900 - (Date.now() - started))));
      setPlan(p);
      setNarration(n);
      setPhase("verdict");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("ask");
    }
  }, [lang]);

  function answer(patch: Partial<Answers>) {
    const next = { ...answers, ...patch };
    setAnswers(next);
    save(next);
    setEditing(null);
    if (isComplete(next)) run(next);
  }

  function intake(next: Answers) {
    setAnswers(next);
    save(next);
    setEditing(null);
    if (isComplete(next)) run(next);
  }

  function edit(step: StepId) {
    setEditing(step);
    setPhase("ask");
  }

  function restart() {
    const keep: Answers = { place: answers.place };
    setAnswers(keep);
    save(keep);
    setPlan(null);
    setNarration(null);
    setEditing(null);
    setPhase("ask");
  }

  async function switchLang(l: "en" | "hi") {
    setLang(l);
    if (isComplete(answers)) {
      const n = await getNarration(toQuery(answers), answers.name ?? null, l).catch(() => null);
      if (n) setNarration(n);
    }
  }

  const step = editing ?? nextStep(answers);
  const showPlan = phase === "verdict" && plan;
  const mood: Mood =
    phase === "thinking" ? "thinking" : showPlan ? moodFor(plan.pick, plan.hours) : phase === "ask" && step === "place" ? "happy" : "careful";
  const sky: Sky = showPlan ? skyFor(plan.pick, plan.hours) : "clear";

  return (
    <>
      <section className={styles.stage}>
        <Scene sky={sky} />
        <AirSign place={answers.place} />
        <div className={styles.inner}>
          <div className={styles.chiku}>
            <Chiku mood={mood} size={230} />
          </div>
          <div className={styles.talk}>
            <ChikuGuide
              phase={phase}
              step={step}
              answers={answers}
              plan={plan}
              narration={narration}
              lang={lang}
              agentEnabled={agentEnabled}
              error={error}
              onAnswer={answer}
              onIntake={intake}
              onEdit={edit}
              onRestart={restart}
              onRun={() => run(answers)}
              onLang={switchLang}
            />
          </div>
        </div>
      </section>

      {showPlan && (
        <PlanDashboard
          plan={plan}
          answers={answers}
          chat={agentEnabled}
          // the PDF uses standard fonts, so it carries the English note only
          note={lang === "en" ? narration?.text ?? null : null}
        />
      )}
    </>
  );
}
