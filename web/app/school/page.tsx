import type { Metadata } from "next";
import SchoolExperience from "@/components/SchoolExperience";

export const metadata: Metadata = {
  title: "For schools | Bahar Khelo",
  description:
    "Re-plan PE, recess and assembly around tomorrow's air quality and heat, and send parents a circular in English or Hindi.",
};

export default function SchoolPage() {
  return <SchoolExperience />;
}
