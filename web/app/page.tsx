import Link from "next/link";
import Chiku from "@/components/Chiku";
import Scene from "@/components/Scene";
import WhyChiku from "@/components/WhyChiku";
import ui from "@/components/ui.module.css";
import styles from "./landing.module.css";

export default function Landing() {
  return (
    <>
      <section className={styles.hero}>
        <Scene sky="clear" />
        <div className={styles.inner}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>For parents and schools across India</p>
            <h1>
              Can the kids play <span className={styles.out}>outside</span> today?
            </h1>
            <p className={styles.lead}>
              Chiku reads the hour-by-hour air quality and heat for your neighbourhood and tells you the safest time
              for your child to play, plus exactly what to do to stay safe.
            </p>
            <div className={styles.actions}>
              <Link href="/start" className={`${ui.btn} ${styles.try}`}>
                Try it out <span aria-hidden>→</span>
              </Link>
              <Link href="/how-it-works" className={ui.btnGhost}>
                How it works
              </Link>
            </div>
          </div>
          <div className={styles.mascot}>
            <p className={styles.bubble}>
              Namaste! I&apos;m <b>Chiku</b>. Let&apos;s find the cleanest, coolest hour to play.
            </p>
            <Chiku mood="happy" size={240} />
          </div>
        </div>
      </section>

      <WhyChiku />
    </>
  );
}
