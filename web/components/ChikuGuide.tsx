"use client";

import { useState } from "react";
import { readIntake } from "@/lib/api";
import {
  ACTIVITY_META, AGE_LABEL, childWord, mergeIntake, STEPS, trailLabel,
  type Answers, type StepId,
} from "@/lib/answers";
import { clock, prettyDate, toTimeInput, fromTimeInput } from "@/lib/format";
import type { Activity, AgeGroup, Narration, ParentPlan } from "@/lib/types";
import Icon from "./Icon";
import PlaceSearch from "./PlaceSearch";
import StatusBadge from "./StatusBadge";
import ui from "./ui.module.css";
import styles from "./ChikuGuide.module.css";

export type Phase = "welcome" | "ask" | "thinking" | "verdict";

interface Props {
  phase: Phase;
  step: StepId | null;
  answers: Answers;
  plan: ParentPlan | null;
  narration: Narration | null;
  lang: "en" | "hi";
  agentEnabled: boolean;
  error: string | null;
  onAnswer: (patch: Partial<Answers>) => void;
  onIntake: (a: Answers) => void;
  onEdit: (step: StepId) => void;
  onRestart: () => void;
  onRun: () => void;
  onLang: (l: "en" | "hi") => void;
}

const HEADLINE = [
  (n: string) => `Good news! ${cap(n)} can go out`,
  (n: string) => `${cap(n)} can go, but gently`,
  (n: string) => `Keep it short for ${n}`,
  () => "Better to stay in today",
];

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ChikuGuide(p: Props) {
  return (
    <div className={styles.bubble} aria-live="polite">
      <Trail answers={p.answers} current={p.phase === "ask" ? p.step : null} onEdit={p.onEdit} />
      {p.phase === "welcome" && <Welcome {...p} />}
      {p.phase === "ask" && p.step && <Question {...p} step={p.step} />}
      {p.phase === "thinking" && (
        <div className={styles.thinking}>
          <p className={styles.say}>
            Reading the sky over {p.answers.place?.name}
            <span className={styles.dots}>
              <i />
              <i />
              <i />
            </span>
          </p>
          <p className={styles.small}>Checking 6 pollutants, heat and humidity for every half hour.</p>
        </div>
      )}
      {p.phase === "verdict" && p.plan && <Verdict {...p} plan={p.plan} />}
      {p.error && (
        <p className={ui.error} role="alert">
          {p.error}
        </p>
      )}
    </div>
  );
}

function Trail({ answers, current, onEdit }: { answers: Answers; current: StepId | null; onEdit: (s: StepId) => void }) {
  const chips = STEPS.map((s) => ({ s, label: trailLabel(s, answers) })).filter((c) => c.label);
  if (!chips.length) return null;
  return (
    <ul className={styles.trail} aria-label="Your answers (tap to change)">
      {chips.map(({ s, label }) => (
        <li key={s}>
          <button type="button" onClick={() => onEdit(s)} aria-current={current === s || undefined}>
            {label}
          </button>
        </li>
      ))}
    </ul>
  );
}

function Welcome({ answers, onRun, onRestart }: Props) {
  const act = answers.activity ? ACTIVITY_META[answers.activity].label.toLowerCase() : "play";
  return (
    <>
      <p className={styles.say}>
        Welcome back! Shall I check {childWord(answers)}&apos;s {act} in {answers.place?.name} again?
      </p>
      <div className={styles.row}>
        <button type="button" className={ui.btn} onClick={onRun}>
          Yes, check now
        </button>
        <button type="button" className={ui.btnGhost} onClick={onRestart}>
          Start fresh
        </button>
      </div>
    </>
  );
}

function Progress({ step }: { step: StepId }) {
  const i = STEPS.indexOf(step);
  return (
    <div className={styles.progress} aria-label={`Question ${i + 1} of ${STEPS.length}`}>
      {STEPS.map((s, j) => (
        <span key={s} data-done={j < i || undefined} data-now={j === i || undefined} />
      ))}
    </div>
  );
}

function Choices<T extends string | number | boolean>({ options, value, onPick }: {
  options: { value: T; label: string; sub?: string; emoji?: string }[];
  value?: T;
  onPick: (v: T) => void;
}) {
  return (
    <div className={styles.choices}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className={styles.choice}
          data-on={o.value === value || undefined}
          onClick={() => onPick(o.value)}
        >
          {o.emoji && <span className={styles.emoji}>{o.emoji}</span>}
          <span className={styles.choiceText}>
            {o.label}
            {o.sub && <small>{o.sub}</small>}
          </span>
        </button>
      ))}
    </div>
  );
}

function Question(p: Props & { step: StepId }) {
  const { step, answers: a, onAnswer } = p;
  const who = childWord(a);
  const [name, setName] = useState(a.name ?? "");

  switch (step) {
    case "place":
      return (
        <>
          <Progress step={step} />
          <p className={styles.say}>
            Namaste! I&apos;m <b>Chiku</b>. I read the air and the heat so kids can play at the safest time.
            Where will your little one be playing?
          </p>
          <PlaceSearch value={a.place ?? null} onChange={(place) => onAnswer({ place })} label="City or locality" compact />
          {p.agentEnabled && <FreeText {...p} />}
        </>
      );
    case "name":
      return (
        <>
          <Progress step={step} />
          <p className={styles.say}>{a.place?.name}, got it! And what&apos;s your child&apos;s name?</p>
          <form
            className={styles.row}
            onSubmit={(e) => {
              e.preventDefault();
              onAnswer({ name: name.trim() || null });
            }}
          >
            <label htmlFor="child-name" className="visually-hidden">
              Child&apos;s name
            </label>
            <input
              id="child-name"
              className={ui.input}
              value={name}
              maxLength={30}
              placeholder="e.g. Aarav"
              autoFocus
              onChange={(e) => setName(e.target.value)}
            />
            <button className={ui.btn}>Next</button>
            <button type="button" className={styles.skip} onClick={() => onAnswer({ name: null })}>
              Skip
            </button>
          </form>
          <p className={styles.small}>Only used to make my notes friendlier. It stays on this device.</p>
        </>
      );
    case "age":
      return (
        <>
          <Progress step={step} />
          <p className={styles.say}>How old is {who}?</p>
          <Choices<AgeGroup>
            value={a.age}
            onPick={(age) => onAnswer({ age })}
            options={(["3-5", "6-10", "11-15"] as AgeGroup[]).map((v) => ({ value: v, label: `${AGE_LABEL[v]} years` }))}
          />
          <p className={styles.small}>Younger children breathe more air per kilo and heat up faster, so I adjust for age.</p>
        </>
      );
    case "asthma":
      return (
        <>
          <Progress step={step} />
          <p className={styles.say}>Does {who} have asthma, or get wheezy when the air is bad?</p>
          <Choices<boolean>
            value={a.asthma}
            onPick={(asthma) => onAnswer({ asthma })}
            options={[
              { value: true, label: "Yes", emoji: "🫁" },
              { value: false, label: "No", emoji: "👍" },
            ]}
          />
          <p className={styles.small}>With asthma I treat every air category one step more strictly.</p>
        </>
      );
    case "activity":
      return (
        <>
          <Progress step={step} />
          <p className={styles.say}>What&apos;s the plan for {who}?</p>
          <Choices<Activity>
            value={a.activity}
            onPick={(activity) => onAnswer({ activity })}
            options={(Object.keys(ACTIVITY_META) as Activity[]).map((k) => ({
              value: k, label: ACTIVITY_META[k].label, sub: ACTIVITY_META[k].sub, emoji: ACTIVITY_META[k].emoji,
            }))}
          />
        </>
      );
    case "minutes":
      return (
        <>
          <Progress step={step} />
          <p className={styles.say}>For how long?</p>
          <Choices<number>
            value={a.minutes}
            onPick={(minutes) => onAnswer({ minutes })}
            options={[30, 60, 90, 120].map((m) => ({ value: m, label: m < 60 ? `${m} min` : `${m / 60} hour${m > 60 ? "s" : ""}` }))}
          />
        </>
      );
    case "day": {
      const late = new Date().getHours() >= 19;
      return (
        <>
          <Progress step={step} />
          <p className={styles.say}>Today or tomorrow?</p>
          <Choices<"today" | "tomorrow">
            value={a.day}
            onPick={(day) => onAnswer({ day })}
            options={[
              { value: "today", label: "Today", sub: late ? "not much daylight left" : undefined },
              { value: "tomorrow", label: "Tomorrow" },
            ]}
          />
        </>
      );
    }
    case "usual":
      return <UsualTime {...p} />;
  }
}

function UsualTime({ answers: a, onAnswer }: Props) {
  const [other, setOther] = useState(false);
  const quick = [7 * 60, 16 * 60, 17 * 60, 18 * 60];
  return (
    <>
      <Progress step="usual" />
      <p className={styles.say}>Last one. When does {childWord(a)} usually head out? I&apos;ll show you the difference.</p>
      <Choices<number>
        value={a.usual}
        onPick={(usual) => onAnswer({ usual })}
        options={quick.map((m) => ({ value: m, label: clock(m) }))}
      />
      {other ? (
        <select
          className={ui.input}
          style={{ marginTop: 10, maxWidth: 200 }}
          defaultValue=""
          aria-label="Usual time"
          onChange={(e) => e.target.value && onAnswer({ usual: fromTimeInput(e.target.value) })}
        >
          <option value="" disabled>
            Pick a time
          </option>
          {Array.from({ length: 27 }, (_, i) => 6 * 60 + i * 30).map((m) => (
            <option key={m} value={toTimeInput(m)}>
              {clock(m)}
            </option>
          ))}
        </select>
      ) : (
        <button type="button" className={styles.skip} onClick={() => setOther(true)}>
          Another time
        </button>
      )}
    </>
  );
}

function FreeText({ answers, onIntake }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 3) return;
    setBusy(true);
    setErr(null);
    try {
      onIntake(mergeIntake(answers, await readIntake(text.trim())));
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Couldn't read that.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className={styles.free} onSubmit={go}>
      <label htmlFor="free" className={styles.freeLabel}>
        <span className={styles.aiTag}>AI</span> Or tell me everything in your own words
      </label>
      <div className={styles.row}>
        <input
          id="free"
          className={ui.input}
          value={text}
          maxLength={500}
          onChange={(e) => setText(e.target.value)}
          placeholder="My 7 yr old Aarav has mild asthma, cricket after school in Noida"
        />
        <button className={ui.btnSmall} disabled={busy || text.trim().length < 3}>
          {busy ? "Reading…" : "Go"}
        </button>
      </div>
      {err && <p className={styles.small}>{err}</p>}
    </form>
  );
}

function Verdict(p: Props & { plan: ParentPlan }) {
  const { plan, answers: a, narration } = p;
  const pick = plan.pick;
  const who = childWord(a);
  const dayWord = plan.day === "today" ? "Today" : "Tomorrow";
  const [done, setDone] = useState<Record<string, boolean>>({});

  return (
    <div className={styles.verdict}>
      <p className={ui.eyebrow}>
        {dayWord}, {prettyDate(plan.date)} · {a.place?.name}
      </p>

      {pick ? (
        <>
          <h2 className={styles.headline}>{HEADLINE[pick.level](who)}</h2>
          <div className={styles.timeRow}>
            <span className={styles.time}>{pick.label}</span>
            <StatusBadge status={pick.status.key} size="lg" />
            <StatusBadge status={pick.status.key} size="lg" hindi />
          </div>
        </>
      ) : (
        <h2 className={styles.headline}>Today&apos;s daylight is nearly gone. Let&apos;s look at tomorrow.</h2>
      )}

      {narration && (
        <div className={styles.note}>
          <p lang={p.lang}>{narration.text}</p>
          <div className={styles.noteFoot}>
            <span className={styles.source} data-src={narration.source}>
              {narration.source === "ai" ? "✨ Written by Chiku's AI from the numbers below" : "Written from the numbers below"}
            </span>
            <span className={styles.langs} role="group" aria-label="Note language">
              <button type="button" aria-pressed={p.lang === "en"} onClick={() => p.onLang("en")}>
                EN
              </button>
              <button type="button" aria-pressed={p.lang === "hi"} onClick={() => p.onLang("hi")} lang="hi">
                हिं
              </button>
            </span>
          </div>
        </div>
      )}

      {plan.split && (
        <div className={styles.split}>
          <span className={styles.splitIcon}>
            <Icon name="split" />
          </span>
          <p>
            <b>Or split it in two:</b> {plan.split.sessions[0].label} and {plan.split.sessions[1].label}. That uses{" "}
            <b>{plan.split.saved_vs_single_pct}% less</b> of {who}&apos;s lung budget than one long session.
          </p>
        </div>
      )}

      {plan.tomorrow_hint && (
        <p className={styles.hint}>
          🌅 Tomorrow looks kinder: <b>{plan.tomorrow_hint.label}</b> ({plan.tomorrow_hint.status.label.toLowerCase()}).
        </p>
      )}

      {plan.prevention.length > 0 && (
        <section className={styles.checklist} aria-label="Chiku's checklist">
          <h3>Chiku&apos;s checklist</h3>
          <ul>
            {plan.prevention.map((s) => (
              <li key={s.id} data-done={done[s.id] || undefined}>
                <label>
                  <input
                    type="checkbox"
                    checked={!!done[s.id]}
                    onChange={(e) => setDone((d) => ({ ...d, [s.id]: e.target.checked }))}
                  />
                  <span className={styles.checkIcon}>
                    <Icon name={s.icon} />
                  </span>
                  <span>
                    <b>{s.title}</b>
                    <small>{s.detail}</small>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={styles.row}>
        <a href="#full-picture" className={ui.btn}>
          See the full picture ↓
        </a>
        <button type="button" className={ui.btnGhost} onClick={p.onRestart}>
          Ask about another child
        </button>
      </div>
    </div>
  );
}
