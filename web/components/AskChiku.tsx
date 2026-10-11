"use client";

import { useEffect, useRef, useState } from "react";
import { askChiku } from "@/lib/api";
import Chiku from "./Chiku";
import ui from "./ui.module.css";
import styles from "./AskChiku.module.css";

interface Turn {
  role: "you" | "chiku";
  text: string;
}

const SUGGESTIONS = [
  "Is 5 PM okay for cricket practice?",
  "Can my 4 year old go to the park tomorrow evening?",
  "कल सुबह साइकिल चलाना ठीक रहेगा?",
];

/** Free-form follow-up questions. Only rendered when the server has a model configured. */
export default function AskChiku({ context, bare = false }: {
  context: Record<string, string | number | boolean | null>;
  /** Render without its own card, when the parent already provides one. */
  bare?: boolean;
}) {
  const [q, setQ] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

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
    <section className={bare ? styles.bare : ui.card}>
      <div className={styles.head}>
        <Chiku mood={busy ? "thinking" : "careful"} size={56} />
        <div>
          <h3 className={ui.cardTitle}>
            Ask Chiku <span className={styles.ai}>AI</span>
          </h3>
          <p className={styles.sub}>
            Ask anything in English, Hindi or Hinglish. Chiku checks the plan before answering, so the numbers match
            this page.
          </p>
        </div>
      </div>

      <div className={styles.log} ref={logRef} aria-live="polite">
        {turns.length === 0 && (
          <div className={styles.suggest}>
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        {turns.map((t, i) => (
          <p key={i} className={styles.turn} data-role={t.role}>
            {t.text}
          </p>
        ))}
        {busy && (
          <p className={styles.turn} data-role="chiku">
            Checking the sky…
          </p>
        )}
      </div>

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
        />
        <button className={ui.btn} disabled={busy || !q.trim()}>
          Ask
        </button>
      </form>
    </section>
  );
}
