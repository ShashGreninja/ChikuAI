import ParentPlanner from "@/components/ParentPlanner";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1>
          Can the kids play <span className={styles.out}>outside</span> today?
        </h1>
        <p>
          Hour-by-hour air quality and heat for your neighbourhood, turned into one simple answer: the safest time for
          your child to be outdoors.
        </p>
      </section>
      <ParentPlanner />
    </div>
  );
}
