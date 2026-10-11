"use client";

import { useRef, useState } from "react";
import CallForm, { useCallsAvailable } from "./CallForm";
import Chiku from "./Chiku";
import Icon from "./Icon";
import styles from "./CallButton.module.css";

/** Phone icon in the header that opens the "Call Chiku" dialog. */
export default function CallButton() {
  const available = useCallsAvailable();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [calling, setCalling] = useState(false);
  if (!available) return null;

  function show() {
    setOpen(true);
    dialog.current?.showModal();
  }

  function close() {
    dialog.current?.close();
  }

  return (
    <>
      <button type="button" className={styles.trigger} onClick={show} aria-haspopup="dialog" title="Get a call from Chiku">
        <Icon name="phone" size={20} />
        <span className={styles.label}>Call Chiku</span>
      </button>

      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="call-dialog-title"
        onClose={() => setOpen(false)}
        // click on the backdrop closes it
        onClick={(e) => e.target === dialog.current && close()}
      >
        <div className={styles.panel}>
          <button type="button" className={styles.close} onClick={close} aria-label="Close">
            ✕
          </button>
          <div className={styles.bird} data-ringing={calling || undefined}>
            <Chiku mood={calling ? "happy" : "careful"} size={96} />
          </div>
          {open && <CallForm titleId="call-dialog-title" onCallingChange={setCalling} />}
        </div>
      </dialog>
    </>
  );
}
