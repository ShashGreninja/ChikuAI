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
        Forecasts: Open-Meteo (CAMS air quality + weather models) · AQI: CPCB National AQI · Breathing rates: US
        EPA Exposure Factors Handbook · Agent: Strands Agents (AWS open source) ·{" "}
        <Link href="/how-it-works">Methodology</Link>
      </p>
    </footer>
  );
}
