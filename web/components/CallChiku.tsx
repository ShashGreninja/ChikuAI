"use client";

import { useEffect, useState } from "react";
import { getHealth, requestCall } from "@/lib/api";
import Chiku from "./Chiku";
import Icon from "./Icon";
import ui from "./ui.module.css";
import styles from "./CallChiku.module.css";

/** "Prefer a phone call?" Chiku rings the parent, asks the questions on the keypad and reads out the plan. */
export default function CallChiku() {
  const [available, setAvailable] = useState(false);
  const [num, setNum] = useState("");
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [calling, setCalling] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getHealth().then((h) => setAvailable(h.calls)).catch(() => {});
  }, []);

  if (!available) return null;

  const digits = num.replace(/\D/g, "");
  const valid = /^[6-9]\d{9}$/.test(digits);

  async function call(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || !consent) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await requestCall(`+91${digits}`, lang, consent);
      setCalling(r.to);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Couldn't place the call.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="call" className={styles.wrap} aria-labelledby="call-title">
      <div className={styles.card}>
        <div className={styles.bird} data-ringing={calling ? true : undefined}>
          <Chiku mood={calling ? "happy" : "careful"} size={120} />
          <span className={styles.phone}>
            <Icon name="phone" size={26} />
          </span>
        </div>

        {calling ? (
          <div className={styles.body} role="status">
            <h2 id="call-title">Calling {calling} now</h2>
            <p>
              Pick up and answer Chiku&apos;s questions on your keypad. It takes about two minutes, and Chiku reads out
              the plan at the end.
            </p>
            <button type="button" className={styles.again} onClick={() => setCalling(null)}>
              Didn&apos;t get the call? Try again
            </button>
          </div>
        ) : (
          <form className={styles.body} onSubmit={call}>
            <h2 id="call-title">Prefer a phone call?</h2>
            <p>
              Chiku will call you, ask the same questions (just press numbers on your phone) and read out the plan.
              Works on any phone, in English or Hindi.
            </p>

            <div className={styles.row}>
              <label className={styles.number}>
                <span className={styles.prefix}>+91</span>
                <input
                  className={ui.input}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="98765 43210"
                  value={num}
                  maxLength={14}
                  onChange={(e) => setNum(e.target.value)}
                  aria-label="Your mobile number"
                />
              </label>
              <span className={styles.langs} role="group" aria-label="Call language">
                <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>
                  English
                </button>
                <button type="button" aria-pressed={lang === "hi"} onClick={() => setLang("hi")} lang="hi">
                  हिंदी
                </button>
              </span>
            </div>

            <label className={styles.consent}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>I agree to get one automated call from Chiku.AI on this number.</span>
            </label>

            <div className={styles.row}>
              <button className={ui.btn} disabled={busy || !valid || !consent}>
                <Icon name="phone" size={18} /> {busy ? "Calling…" : "Call me"}
              </button>
              {num && !valid && <span className={styles.hint}>Enter a 10-digit Indian mobile number.</span>}
            </div>
            {err && (
              <p className={styles.err} role="alert">
                {err}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
