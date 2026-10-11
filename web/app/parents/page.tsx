import type { Metadata } from "next";
import ParentExperience from "@/components/ParentExperience";

export const metadata: Metadata = {
  title: "For parents | Bahar Khelo",
  description: "Answer a few questions and Chiku finds the safest time for your child to play outside, with a checklist.",
};

export default function ParentsPage() {
  return <ParentExperience />;
}
