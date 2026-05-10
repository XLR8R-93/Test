import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Root redirects to /today (the main dashboard tab)
export default async function RootPage() {
  const session = await auth();
  if (!session) redirect("/login");
  redirect("/today");
}
