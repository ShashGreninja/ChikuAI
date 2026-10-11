"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Chiku from "./Chiku";
import styles from "./SiteHeader.module.css";

const LINKS = [
  { href: "/parents", label: "For parents" },
  { href: "/school", label: "For schools" },
  { href: "/how-it-works", label: "How it works" },
];

export default function SiteHeader() {
  const path = usePathname();
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="Chiku.AI home">
        <span className={styles.logo}>
          <Chiku mood="careful" size={44} />
        </span>
        <span className={styles.word}>
          <span>
            Chiku<span className={styles.ai}>.AI</span>
          </span>
          <span className={styles.hi} lang="hi">बाहर खेलने का सही समय</span>
        </span>
      </Link>
      <nav className={styles.nav} aria-label="Main">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={styles.link} aria-current={path === l.href ? "page" : undefined}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
