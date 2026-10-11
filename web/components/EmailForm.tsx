"use client";

import { useEffect, useState } from "react";
import { getHealth } from "@/lib/api";
import Icon from "./Icon";
import ui from "./ui.module.css";
import styles from "./EmailForm.module.css";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX = 10;

function parse(text: string): string[] {
  return text.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
}

/**
 * Email a PDF. When the server can send mail (Amazon SES) it goes out as an attachment;
 * otherwise the user's own mail app opens with the message and the PDF downloads to attach.
 */
export default function EmailForm({ label, subject, body, send, download }: {
  label: string;
  subject: string;
  body: string;
  send: (to: string[]) => Promise<{ sent: number }>;
  download: () => Promise<void>;
}) {
  const [serverMail, setServerMail] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    getHealth().then((h) => setServerMail(h.email)).catch(() => {});
  }, []);

  const to = parse(text);
  const bad = to.filter((t) => !EMAIL.test(t));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!to.length || bad.length || to.length > MAX) return;
    setBusy(true);
    setMsg(null);
    try {
      if (serverMail) {
        const r = await send(to);
        setMsg({ ok: true, text: `Sent to ${r.sent} address${r.sent > 1 ? "es" : ""}, with the PDF attached.` });
        setText("");
      } else {
        await download();
        window.location.href = `mailto:${to.join(",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${body}\n\n(The PDF is attached.)`)}`;
        setMsg({ ok: true, text: "Your email app should open with the message. The PDF just downloaded: attach it before sending." });
      }
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Couldn't send the email." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.box} onSubmit={submit}>
      <label htmlFor="email-to" className={styles.label}>
        <Icon name="mail" size={20} /> {label}
      </label>
      <div className={styles.row}>
        <input
          id="email-to"
          className={ui.input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="principal@school.in, staff@school.in"
          autoComplete="email"
          inputMode="email"
        />
        <button className={ui.btnSmall} disabled={busy || !to.length || bad.length > 0 || to.length > MAX}>
          {busy ? "Sending…" : serverMail ? "Send" : "Open in email app"}
        </button>
      </div>
      {bad.length > 0 ? (
        <p className={styles.note} data-bad>
          Check {bad.length === 1 ? "this address" : "these addresses"}: {bad.join(", ")}
        </p>
      ) : to.length > MAX ? (
        <p className={styles.note} data-bad>
          Up to {MAX} addresses at a time. A group or list address works well.
        </p>
      ) : msg ? (
        <p className={styles.note} data-bad={!msg.ok || undefined} role="status">
          {msg.text}
        </p>
      ) : (
        <p className={styles.note}>Separate addresses with commas. A staff list address works too.</p>
      )}
    </form>
  );
}
