import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const dbPath = path.join(process.cwd(), "prisma", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const db = new PrismaClient({ adapter });

async function main() {
  const password1 = await bcrypt.hash("password123", 12);
  const password2 = await bcrypt.hash("password123", 12);

  const user1 = await db.user.upsert({
    where: { email: "user1@example.com" },
    update: {},
    create: {
      email: "user1@example.com",
      passwordHash: password1,
      name: "User One",
      targetCalories: 2000,
      targetProteinG: 150,
      targetCarbsG: 200,
      targetFatG: 65,
    },
  });

  const user2 = await db.user.upsert({
    where: { email: "user2@example.com" },
    update: {},
    create: {
      email: "user2@example.com",
      passwordHash: password2,
      name: "User Two",
      targetCalories: 1800,
      targetProteinG: 130,
      targetCarbsG: 180,
      targetFatG: 60,
    },
  });

  // Link as partners (user1 can see user2's data)
  await db.user.update({
    where: { id: user1.id },
    data: { shareWithPartnerId: user2.id },
  });

  console.log("✓ Seeded:", user1.email, user2.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
