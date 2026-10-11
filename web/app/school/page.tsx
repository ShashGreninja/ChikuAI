import type { Metadata } from "next";
import SchoolPlanner from "@/components/SchoolPlanner";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "For schools — Bahar Khelo",
  description: "Re-plan PE, recess and assembly around tomorrow's air quality and heat, and send parents a circular.",
};

export default function SchoolPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1>
          Plan tomorrow&apos;s <span className={styles.out}>outdoor</span> periods in a minute
        </h1>
        <p>
          For principals and PE teachers. Chiku checks every outdoor period against the hourly air and heat forecast
          for your campus, reshuffles what can move, and drafts the note for parents in English and Hindi.
        </p>
      </section>
      <SchoolPlanner />
    </div>
  );
}
