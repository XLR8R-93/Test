import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { signOut } from "@/auth";

export default async function SettingsPage() {
  const session = await auth();

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div
        className="rounded-xl border p-4 space-y-1"
        style={{ borderColor: "var(--border)" }}
      >
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="font-medium">{session?.user?.name}</p>
        <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Goal setup, TDEE calculator, and macro targets — coming in Phase 5.
        </p>
      </div>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <Button variant="outline" className="w-full text-destructive hover:text-destructive">
          Sign out
        </Button>
      </form>
    </div>
  );
}
