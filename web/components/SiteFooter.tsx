import Link from "next/link";
import styles from "./SiteFooter.module.css";

export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <p>
        <strong>Guidance, not medical advice.</strong> If a child is coughing, wheezing or feels unwell, stop
        and see a doctor.
      </p>
      <p className={styles.meta}>
        Forecasts: Open-Meteo (CAMS air quality and weather models) · AQI: CPCB National AQI · Guidelines: WHO
        2021 · Breathing rates: US EPA Exposure Factors Handbook · <Link href="/how-it-works">How Chiku decides</Link>
      </p>
    </footer>
  );
}
