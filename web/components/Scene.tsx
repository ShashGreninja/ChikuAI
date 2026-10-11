import styles from "./Scene.module.css";

export type Sky = "clear" | "hazy" | "smog" | "hot" | "night";

/**
 * A neighbourhood park on the edge of an Indian city. The sky is the forecast: it clears,
 * hazes, browns or burns with the verdict, so the page tells the story before you read it.
 */
export default function Scene({ sky = "clear" }: { sky?: Sky }) {
  return (
    <div className={styles.scene} data-sky={sky} aria-hidden>
      <svg className={styles.svg} viewBox="0 0 1440 420" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className={styles.skyTop} />
            <stop offset="1" className={styles.skyBottom} />
          </linearGradient>
        </defs>

        <rect width="1440" height="420" fill="url(#sky)" />

        {/* sun / moon */}
        <g className={styles.sun}>
          <circle cx="1210" cy="96" r="70" className={styles.sunGlow} />
          <circle cx="1210" cy="96" r="44" className={styles.sunDisc} />
        </g>
        <g className={styles.moon}>
          <circle cx="1210" cy="92" r="36" fill="#f6efd9" />
          <circle cx="1226" cy="82" r="32" className={styles.moonCut} />
          <g fill="#f6efd9">
            <circle cx="220" cy="70" r="2" />
            <circle cx="420" cy="40" r="1.6" />
            <circle cx="640" cy="90" r="2.2" />
            <circle cx="900" cy="54" r="1.6" />
            <circle cx="1040" cy="130" r="2" />
          </g>
        </g>

        {/* clouds */}
        <g className={styles.clouds}>
          <path d="M120 120 a28 28 0 0 1 54 -10 a22 22 0 0 1 40 12 a18 18 0 0 1 -6 34 h-86 a20 20 0 0 1 -2 -36z" />
          <path d="M640 80 a24 24 0 0 1 46 -8 a20 20 0 0 1 36 10 a16 16 0 0 1 -4 30 h-76 a18 18 0 0 1 -2 -32z" />
        </g>

        {/* far city: flats, a water tank, a temple spire, a mosque dome, a mobile tower */}
        <g className={styles.city}>
          <path d="M0 300 V250 h60 v-30 h50 v40 h40 v-60 h70 v70 h30 v-20 h40 v40 h20 V300z" />
          <path d="M330 300 v-70 h24 l12 -40 l12 40 h24 v70z" />
          <path d="M420 300 v-95 h80 v95z" />
          <path d="M520 300 v-40 a40 40 0 0 1 80 0 v40z M556 220 h8 v-14 h-8z" />
          <path d="M630 300 v-120 h18 v-30 h6 v30 h18 v120z" />
          <path d="M700 300 v-60 h90 v60z M730 240 v-36 a15 15 0 0 1 30 0 v36z" />
          <path d="M820 300 v-140 h70 v140z" />
          <path d="M905 300 v-78 h60 v78z" />
          <path d="M990 300 v-60 l28 -36 l28 36 v60z" />
          <path d="M1070 300 v-110 h56 v110z" />
          <path d="M1150 300 v-64 h90 v64z" />
          <path d="M1260 300 v-96 h72 v96z" />
          <path d="M1350 300 v-50 h90 v50z" />
        </g>

        {/* haze veil, opacity driven by the sky state */}
        <rect className={styles.haze} width="1440" height="420" />

        {/* trees */}
        <g className={styles.trees}>
          <circle cx="90" cy="300" r="48" />
          <circle cx="150" cy="286" r="58" />
          <circle cx="210" cy="306" r="40" />
          <circle cx="1240" cy="296" r="54" />
          <circle cx="1310" cy="280" r="64" />
          <circle cx="1380" cy="302" r="46" />
        </g>
        <g className={styles.trunks}>
          <rect x="144" y="320" width="12" height="40" rx="4" />
          <rect x="1304" y="320" width="12" height="40" rx="4" />
        </g>

        {/* ground */}
        <path className={styles.ground} d="M0 350 C 300 320, 520 336, 760 334 S 1200 320, 1440 340 V420 H0z" />
        <path className={styles.path} d="M560 420 C 640 380, 760 360, 900 352" />

        {/* swing */}
        <g className={styles.swing}>
          <path d="M1010 352 L1040 262 L1070 352 M1130 352 L1160 262 L1190 352 M1040 262 H1160" />
          <path className={styles.swingSeat} d="M1080 262 V322 M1112 262 V322 M1076 324 H1116" />
        </g>
        {/* slide */}
        <g className={styles.swing}>
          <path d="M300 352 V286 h22 v66 M300 286 l-14 -10 h50 l-14 10 M322 300 C 360 300, 380 340, 420 352" />
          <path d="M306 300 h10 M306 316 h10 M306 332 h10" />
        </g>

        {/* birds */}
        <g className={styles.birds}>
          <path d="M520 150 q8 -8 16 0 q8 -8 16 0" />
          <path d="M566 132 q6 -6 12 0 q6 -6 12 0" />
        </g>
      </svg>
    </div>
  );
}
