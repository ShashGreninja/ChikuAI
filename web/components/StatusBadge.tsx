import { STATUS_META } from "@/lib/format";
import type { StatusKey } from "@/lib/types";
import styles from "./StatusBadge.module.css";

/** Status is never colour alone: every badge carries an icon and a word. */
export default function StatusBadge({ status, size = "md", hindi = false }: {
  status: StatusKey;
  size?: "sm" | "md" | "lg";
  hindi?: boolean;
}) {
  const m = STATUS_META[status];
  return (
    <span className={`${styles.badge} ${styles[size]}`} data-status={status}>
      <span className={styles.icon} aria-hidden>
        {m.icon}
      </span>
      {hindi ? <span lang="hi">{m.hi}</span> : m.label}
    </span>
  );
}
