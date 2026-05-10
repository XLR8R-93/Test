import { redirect } from "next/navigation";

// Route "/" is handled by app/page.tsx; this file should not be reached.
// If it is, redirect to /today.
export default function DashboardRoot() {
  redirect("/today");
}
