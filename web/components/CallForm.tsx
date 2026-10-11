"use client";

import { useState } from "react";
import { requestCall } from "@/lib/api";
import Icon from "./Icon";
import ui from "./ui.module.css";
import styles from "./CallForm.module.css";

/** Number, language, consent, then "Calling you now". Shared by the /parents card and the landing page button. */
export default function CallForm({ titleId, onCallingChange }: {
  titleId: string;
  onCallingChange?: (calling: boolean) => void;
}) {
  const [num, setNum] = useState("");
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [calling, setCalling] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const digits = num.replace(/\D/g, "");
  const valid = /^[6-9]\d{9}$/.test(digits);

  function setCallingTo(to: string | null) {
    setCalling(to);
    onCallingChange?.(to !== null);
  }

  async function call(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || !consent) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await requestCall(`+91${digits}`, lang, consent);
      setCallingTo(r.to);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Couldn't place the call.");
    } finally {
      setBusy(false);
    }
  }

  if (calling) {
    return (
      <div className={styles.body} role="status">
        <h2 id={titleId}>Calling {calling} now</h2>
        <p>
          Pick up and answer Chiku&apos;s questions on your keypad. It takes about two minutes, and Chiku reads out the
          plan at the end.
        </p>
        <button type="button" className={styles.again} onClick={() => setCallingTo(null)}>
          Didn&apos;t get the call? Try again
        </button>
      </div>
    );
  }

  return (
    <form className={styles.body} onSubmit={call}>
      <h2 id={titleId}>Prefer a phone call?</h2>
      <p>
        Chiku will call you, ask a few questions (just press numbers on your phone) and read out the plan. Works on
        any phone, in English or Hindi.
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
  );
}
