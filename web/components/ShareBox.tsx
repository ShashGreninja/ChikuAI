"use client";

import { useState } from "react";
import type { Lang } from "@/lib/messages";
import ui from "./ui.module.css";
import styles from "./ShareBox.module.css";

/** A ready-to-send message in English or Hindi, with copy + WhatsApp. */
export default function ShareBox({ title, sub, build, actions, children }: {
  title: string;
  sub: string;
  build: (lang: Lang) => string;
  /** Extra buttons next to Copy and WhatsApp, such as a PDF download. */
  actions?: React.ReactNode;
  /** Anything that belongs under the actions, such as the email form. */
  children?: React.ReactNode;
}) {
  const [lang, setLang] = useState<Lang>("en");
  const [copied, setCopied] = useState(false);
  const text = build(lang);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className={ui.card}>
      <div className={styles.head}>
        <div>
          <h3 className={ui.cardTitle}>{title}</h3>
          <p className={styles.sub}>{sub}</p>
        </div>
        <div className={styles.lang} role="group" aria-label="Message language">
          <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>
            English
          </button>
          <button type="button" aria-pressed={lang === "hi"} onClick={() => setLang("hi")} lang="hi">
            हिंदी
          </button>
        </div>
      </div>
      <pre className={styles.msg} lang={lang}>
        {text}
      </pre>
      <div className={styles.actions}>
        <button type="button" className={ui.btnSmall} onClick={copy}>
          {copied ? "Copied ✓" : "Copy"}
        </button>
        <a
          className={styles.wa}
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Share on WhatsApp
        </a>
        {actions}
      </div>
      {children}
    </section>
  );
}
