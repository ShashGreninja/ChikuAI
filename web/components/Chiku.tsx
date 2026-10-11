import styles from "./Chiku.module.css";

export type Mood = "happy" | "careful" | "masked" | "hot" | "sleepy" | "thinking";

const ALT: Record<Mood, string> = {
  happy: "Chiku the sparrow, flapping happily",
  careful: "Chiku the sparrow, looking a little careful",
  masked: "Chiku the sparrow, wearing a mask",
  hot: "Chiku the sparrow, sweating in the heat",
  sleepy: "Chiku the sparrow, asleep",
  thinking: "Chiku the sparrow, thinking",
};

/**
 * Chiku — a house sparrow (Delhi's state bird, and one that has quietly vanished from
 * many Indian cities). Every mood is the same drawing with a few layers switched on.
 */
export default function Chiku({ mood = "happy", size = 160 }: { mood?: Mood; size?: number }) {
  const eyesClosed = mood === "happy" || mood === "sleepy";
  return (
    <svg
      className={`${styles.chiku} ${styles[mood]}`}
      width={size}
      height={size}
      viewBox="0 0 160 160"
      role="img"
      aria-label={ALT[mood]}
    >
      <ellipse cx="78" cy="151" rx="40" ry="5" fill="#2a1f14" opacity="0.12" />

      <g className={styles.body}>
        {/* legs */}
        <g stroke="#d9862a" strokeWidth="3.5" strokeLinecap="round" fill="none">
          <path d="M66 134 L64 148 M64 148 L58 150 M64 148 L68 151" />
          <path d="M84 135 L85 148 M85 148 L79 150 M85 148 L90 151" />
        </g>

        {/* tail */}
        <path d="M38 104 L8 90 L14 106 L6 120 L40 118 Z" fill="#6b4a2f" stroke="#2a1f14" strokeWidth="2.5" strokeLinejoin="round" />

        {/* body + belly */}
        <ellipse cx="74" cy="106" rx="44" ry="36" fill="#b07a4f" stroke="#2a1f14" strokeWidth="2.5" />
        <path d="M66 128 C 76 140, 108 136, 114 114 C 116 100, 108 92, 100 92 C 90 104, 78 116, 66 128 Z" fill="#f1e2c6" />

        {/* wing */}
        <g className={styles.wing}>
          <path
            d="M36 96 C 48 76, 90 78, 94 100 C 84 118, 54 120, 36 106 Z"
            fill="#7b5236"
            stroke="#2a1f14"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M50 92 C 62 88, 76 90, 86 98 M48 102 C 60 100, 72 102, 82 108" stroke="#f1e2c6" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>

        {/* head */}
        <g className={styles.head}>
          <circle cx="100" cy="62" r="32" fill="#b07a4f" stroke="#2a1f14" strokeWidth="2.5" />
          <path d="M70 56 C 74 32, 118 24, 130 50 C 116 42, 88 44, 70 56 Z" fill="#8e8a84" stroke="#2a1f14" strokeWidth="2" strokeLinejoin="round" />
          <ellipse cx="106" cy="76" rx="17" ry="11" fill="#f4ebdd" />
          <path d="M116 84 C 122 92, 116 102, 102 100 C 108 96, 110 90, 116 84 Z" fill="#2a1f14" />
          <ellipse className={styles.blush} cx="100" cy="80" rx="6" ry="3.5" fill="#f29c8f" />

          {/* beak */}
          <path d="M128 60 L148 67 L128 74 Z" fill="#f4a62a" stroke="#2a1f14" strokeWidth="2.5" strokeLinejoin="round" />

          {/* eyes */}
          {eyesClosed ? (
            <path
              d={mood === "happy" ? "M108 60 Q114 52 120 60" : "M108 58 Q114 64 120 58"}
              stroke="#2a1f14"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            <g className={styles.eye}>
              <circle cx="114" cy="58" r="5.5" fill="#2a1f14" />
              <circle cx="116" cy="56" r="1.8" fill="#fff" />
            </g>
          )}

          {(mood === "careful" || mood === "masked" || mood === "hot") && (
            <path d="M106 46 L120 49" stroke="#2a1f14" strokeWidth="3" strokeLinecap="round" />
          )}

          {mood === "masked" && (
            <g>
              <path d="M126 64 L96 52 M126 76 L96 80" stroke="#cfc6b8" strokeWidth="2.5" />
              <rect x="118" y="57" width="34" height="22" rx="9" fill="#ffffff" stroke="#2a1f14" strokeWidth="2.5" />
              <path d="M124 64 H146 M124 70 H146" stroke="#e1d8c8" strokeWidth="2" />
            </g>
          )}
        </g>
      </g>

      {mood === "happy" && (
        <g className={styles.sparkles} fill="#f4a62a" stroke="#2a1f14" strokeWidth="1.5">
          <path d="M138 24 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" />
          <path d="M24 46 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" />
        </g>
      )}

      {mood === "hot" && (
        <g className={styles.drops} fill="#8ec5d6" stroke="#2a1f14" strokeWidth="1.8">
          <path d="M72 30 C 72 30, 64 40, 64 45 a 8 8 0 0 0 16 0 C 80 40, 72 30, 72 30 Z" />
          <path d="M138 34 C 138 34, 132 41, 132 45 a 6 6 0 0 0 12 0 C 144 41, 138 34, 138 34 Z" />
        </g>
      )}

      {mood === "sleepy" && (
        <g className={styles.zzz} fontFamily="var(--font-display)" fontWeight="800" fill="#2a1f14">
          <text x="128" y="34" fontSize="18">z</text>
          <text x="142" y="20" fontSize="13">z</text>
        </g>
      )}

      {mood === "thinking" && (
        <g className={styles.dots} fill="#2a1f14">
          <circle cx="128" cy="26" r="4" />
          <circle cx="140" cy="26" r="4" />
          <circle cx="152" cy="26" r="4" />
        </g>
      )}
    </svg>
  );
}
