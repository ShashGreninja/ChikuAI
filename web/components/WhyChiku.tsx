import Link from "next/link";
import Chiku, { type Mood } from "./Chiku";
import Icon from "./Icon";
import styles from "./WhyChiku.module.css";

const REASONS = [
  {
    icon: "clock",
    title: "One AQI number hides the day",
    body: "The AQI you see is an average. Your child plays for one hour, and that hour can be much cleaner or much dirtier than the day's number.",
  },
  {
    icon: "lungs",
    title: "Kids breathe more",
    body: "A 6 to 10 year old at play takes in about twice as much air per kilo as an adult. The same air does more to them.",
  },
  {
    icon: "sun",
    title: "Heat and ozone peak together",
    body: "Afternoon sun cooks up ozone and pushes heat stress, right when most kids head out after school.",
  },
];

const STEPS: { mood: Mood; title: string; body: string }[] = [
  { mood: "careful", title: "Chiku asks", body: "Where, who, what they'll do and for how long. A few taps, under a minute." },
  { mood: "thinking", title: "Chiku reads the sky", body: "Six pollutants, heat and humidity for every half hour, scored for your child." },
  { mood: "happy", title: "You get a plan", body: "The best time, a checklist that fits the day's air, and a message for the family." },
];

/** What the home page shows under the conversation until there's a plan. */
export default function WhyChiku() {
  return (
    <div className={styles.wrap}>
      <section className={styles.why} aria-labelledby="why-title">
        <h2 id="why-title">Why not just check the AQI?</h2>
        <ul className={styles.reasons}>
          {REASONS.map((r) => (
            <li key={r.title}>
              <span className={styles.icon}>
                <Icon name={r.icon} size={28} />
              </span>
              <h3>{r.title}</h3>
              <p>{r.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.how} aria-labelledby="how-title">
        <h2 id="how-title">How Chiku helps</h2>
        <ol className={styles.steps}>
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <div className={styles.bird}>
                <Chiku mood={s.mood} size={92} />
                <span className={styles.num}>{i + 1}</span>
              </div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.ctas}>
        <Link href="/school" className={styles.cta} data-tone="school">
          <span className={styles.ctaIcon}>
            <Icon name="school" size={30} />
          </span>
          <span>
            <b>Running a school?</b>
            <small>Re-plan PE, recess and assembly for tomorrow and send parents a note.</small>
          </span>
          <span className={styles.arrow} aria-hidden>
            →
          </span>
        </Link>
        <Link href="/how-it-works" className={styles.cta} data-tone="how">
          <span className={styles.ctaIcon}>
            <Icon name="lungs" size={30} />
          </span>
          <span>
            <b>How does Chiku decide?</b>
            <small>The lung budget, heat, and the science behind every number.</small>
          </span>
          <span className={styles.arrow} aria-hidden>
            →
          </span>
        </Link>
      </section>
    </div>
  );
}
