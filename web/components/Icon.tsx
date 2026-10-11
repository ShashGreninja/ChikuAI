/** Hand-drawn style line icons for Chiku's checklist. 24×24, ink stroke. */
const PATHS: Record<string, React.ReactNode> = {
  water: (
    <>
      <path d="M9 3h6v3l1.5 2v11a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V8L9 6z" />
      <path d="M7.5 12h9M10 15.5c.8.6 3.2.6 4 0" />
    </>
  ),
  shade: (
    <>
      <path d="M3 11a9 9 0 0 1 18 0z" />
      <path d="M12 11v8a2 2 0 0 1-4 0" />
    </>
  ),
  mask: (
    <>
      <path d="M5 9c3-2 11-2 14 0v4c0 3-3.5 5-7 5s-7-2-7-5z" />
      <path d="M5 10H3a2 2 0 0 0 2 4M19 10h2a2 2 0 0 1-2 4M8.5 12h7M9 15h6" />
    </>
  ),
  route: (
    <>
      <path d="M6 20c0-6 12-4 12-10" strokeDasharray="2 3" />
      <path d="M18 3a3 3 0 0 0-3 3c0 2.5 3 5 3 5s3-2.5 3-5a3 3 0 0 0-3-3z" />
      <circle cx="6" cy="20" r="1.6" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
    </>
  ),
  inhaler: (
    <>
      <path d="M9 3h5v7H9z" />
      <path d="M7 10h9v6h4v4H9a2 2 0 0 1-2-2z" />
    </>
  ),
  home: (
    <>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10M10 20v-5h4v5" />
    </>
  ),
  window: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M12 3v18M4 12h16" />
      <path d="M15 7.5c1 0 1.5.6 2 1.5" />
    </>
  ),
  rain: (
    <>
      <path d="M7 15a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.6 1.2A3.4 3.4 0 0 1 17 15z" />
      <path d="M8 18l-1 2.5M12 18l-1 2.5M16 18l-1 2.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  lungs: (
    <>
      <path d="M12 3v8M12 11c-1 1-2.5 1.5-4 1.5M12 11c1 1 2.5 1.5 4 1.5" />
      <path d="M8.5 6.5C5 7 3 11 3 16c0 2.5 1.5 4 3.5 4S10 18.5 10 16V9.5c0-1.7-.5-3-1.5-3z" />
      <path d="M15.5 6.5C19 7 21 11 21 16c0 2.5-1.5 4-3.5 4S14 18.5 14 16V9.5c0-1.7.5-3 1.5-3z" />
    </>
  ),
  school: (
    <>
      <path d="M3 10l9-5 9 5-9 5z" />
      <path d="M7 12.5V17c2.5 2 7.5 2 10 0v-4.5M21 10v5" />
    </>
  ),
  split: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18" />
      <path d="M7 9l2 2-2 2M17 9l-2 2 2 2" />
    </>
  ),
};

export default function Icon({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[name] ?? PATHS.clock}
    </svg>
  );
}
