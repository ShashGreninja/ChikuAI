import type { Metadata } from "next";
import SchoolWorkspace from "@/components/school/SchoolWorkspace";

export const metadata: Metadata = {
  title: "For schools | Chiku.AI",
  description:
    "Set up your timetable once. Every morning, Chiku tells you what each outdoor period should do, suggests PE swaps and prepares the bulletin.",
};

export default function SchoolPage() {
  return <SchoolWorkspace />;
}
