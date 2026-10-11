import type { Metadata } from "next";
import Link from "next/link";
import Chiku from "@/components/Chiku";
import Icon from "@/components/Icon";
import Scene from "@/components/Scene";
import styles from "./start.module.css";

export const metadata: Metadata = {
  title: "Get started | Bahar Khelo",
  description: "Plan outdoor time for your child, or re-plan your school's outdoor periods around the air and heat.",
};

const OPTIONS = [
  {
    href: "/parents",
    icon: "parent",
    title: "For parents",
    body: "Find the safest time for your child to play today or tomorrow, with a checklist for the day.",
    tone: "parents",
  },
  {
    href: "/school",
    icon: "school",
    title: "For schools",
    body: "Set up your timetable once. Each morning, get a plan for every outdoor period and a bulletin for staff.",
    tone: "schools",
  },
];

export default function Start() {
  return (
    <section className={styles.stage}>
      <Scene sky="clear" />
      <div className={styles.inner}>
        <div className={styles.bird}>
          <Chiku mood="careful" size={190} />
        </div>
        <div className={styles.panel}>
          <h1>Who&apos;s planning today?</h1>
          <ul className={styles.options}>
            {OPTIONS.map((o) => (
              <li key={o.href}>
                <Link href={o.href} className={styles.option} data-tone={o.tone}>
                  <span className={styles.icon}>
                    <Icon name={o.icon} size={34} />
                  </span>
                  <span className={styles.text}>
                    <b>{o.title}</b>
                    <small>{o.body}</small>
                  </span>
                  <span className={styles.arrow} aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
