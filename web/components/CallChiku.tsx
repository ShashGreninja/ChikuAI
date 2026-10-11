"use client";

import { useState } from "react";
import CallForm, { useCallsAvailable } from "./CallForm";
import Chiku from "./Chiku";
import Icon from "./Icon";
import styles from "./CallChiku.module.css";

/** "Prefer a phone call?" card on /parents: Chiku rings the parent and reads out the plan. */
export default function CallChiku() {
  const available = useCallsAvailable();
  const [calling, setCalling] = useState(false);
  if (!available) return null;

  return (
    <section id="call" className={styles.wrap} aria-labelledby="call-title">
      <div className={styles.card}>
        <div className={styles.bird} data-ringing={calling || undefined}>
          <Chiku mood={calling ? "happy" : "careful"} size={120} />
          <span className={styles.phone}>
            <Icon name="phone" size={26} />
          </span>
        </div>
        <CallForm titleId="call-title" onCallingChange={setCalling} />
      </div>
    </section>
  );
}
