import { auth } from "@/auth";

export default async function TodayPage() {
  const session = await auth();
  const name = session?.user?.name?.split(" ")[0] ?? "there";
  const today = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hey, {name} 👋</h1>
        <p className="text-sm text-muted-foreground">{today}</p>
      </div>

      {/* Calorie summary */}
      <div
        className="rounded-2xl p-5 space-y-1"
        style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
      >
        <p className="text-sm font-medium opacity-80">Calories remaining</p>
        <p className="text-5xl font-bold">—</p>
        <p className="text-sm opacity-70">Set up your goals in Settings</p>
      </div>

      {/* Macro pills */}
      <div className="grid grid-cols-3 gap-3">
        {["Protein", "Carbs", "Fat"].map((macro) => (
          <div
            key={macro}
            className="rounded-xl p-3 text-center border"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <p className="text-xs text-muted-foreground">{macro}</p>
            <p className="text-xl font-semibold mt-0.5">—</p>
            <p className="text-xs text-muted-foreground">/ — g</p>
          </div>
        ))}
      </div>

      {/* Meal sections */}
      {["Breakfast", "Lunch", "Dinner", "Snacks"].map((meal) => (
        <section key={meal}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">{meal}</h2>
            <span className="text-xs text-muted-foreground">0 kcal</span>
          </div>
          <div
            className="rounded-xl border p-4 text-center text-sm text-muted-foreground"
            style={{ borderColor: "var(--border)", borderStyle: "dashed" }}
          >
            Nothing logged yet — tap Log to add food
          </div>
        </section>
      ))}
    </div>
  );
}
