"use client";

import { useEffect, useRef, useState } from "react";
import { askChiku, getHealth } from "@/lib/api";
import Chiku from "./Chiku";
import ui from "./ui.module.css";
import styles from "./AskChiku.module.css";

interface Turn {
  role: "you" | "chiku";
  text: string;
}

const SUGGESTIONS = [
  "Is 5 PM okay for cricket practice?",
  "Can my 4-year-old go to the park tomorrow evening?",
  "कल सुबह साइकिल चलाना ठीक रहेगा?",
];

export default function AskChiku({ context }: { context: Record<string, string | number | boolean | null> }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [q, setQ] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getHealth()
      .then((h) => setEnabled(h.agent))
      .catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setTurns((t) => [...t, { role: "you", text: question }]);
    setQ("");
    setBusy(true);
    try {
      const { answer } = await askChiku(question, context);
      setTurns((t) => [...t, { role: "chiku", text: answer }]);
    } catch (e) {
      setTurns((t) => [...t, { role: "chiku", text: e instanceof Error ? e.message : "Something went wrong." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={ui.card}>
      <div className={styles.head}>
        <Chiku mood={busy ? "thinking" : "careful"} size={56} />
        <div>
          <h3 className={ui.cardTitle}>Ask Chiku</h3>
          <p className={styles.sub}>Ask in English, Hindi or Hinglish. Chiku checks the forecast before answering.</p>
        </div>
      </div>

      {enabled === false ? (
        <p className={styles.off}>
          Chat is off on this server. Add a free <code>GEMINI_API_KEY</code> to <code>api/.env</code> to switch it on.
          Everything else works without it.
        </p>
      ) : (
        <>
          {turns.length > 0 && (
            <div className={styles.log} ref={logRef} aria-live="polite">
              {turns.map((t, i) => (
                <p key={i} className={styles.turn} data-role={t.role}>
                  {t.text}
                </p>
              ))}
              {busy && <p className={styles.turn} data-role="chiku">Checking the sky…</p>}
            </div>
          )}

          {turns.length === 0 && (
            <div className={styles.suggest}>
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} disabled={!enabled}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              send(q);
            }}
          >
            <label htmlFor="ask" className="visually-hidden">
              Your question
            </label>
            <input
              id="ask"
              className={ui.input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. Is it safe to cycle to tuition at 6?"
              maxLength={500}
              disabled={!enabled}
            />
            <button className={ui.btn} disabled={busy || !enabled || !q.trim()}>
              Ask
            </button>
          </form>
        </>
      )}
    </section>
  );
}
