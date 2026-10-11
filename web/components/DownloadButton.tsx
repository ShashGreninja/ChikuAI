"use client";

import { useState } from "react";
import Icon from "./Icon";
import styles from "./DownloadButton.module.css";

/** Runs `make` (which triggers a file download) with a busy state and an inline error. */
export default function DownloadButton({ make, label = "Download PDF report" }: {
  make: () => Promise<void>;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setErr(null);
    try {
      await make();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't make the report.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className={styles.wrap}>
      <button type="button" className={styles.btn} onClick={go} disabled={busy}>
        <Icon name="download" size={18} />
        {busy ? "Preparing…" : label}
      </button>
      {err && <span className={styles.err}>{err}</span>}
    </span>
  );
}
