import "dotenv/config";
import { hash } from "bcryptjs";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../lib/generated/prisma/client";

const BCRYPT_COST = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function main() {
  const emailRaw = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Admin";

  if (!emailRaw || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be set in your environment (.env).",
    );
  }
  if (!EMAIL_PATTERN.test(emailRaw)) {
    throw new Error(`ADMIN_EMAIL is not a valid email: ${emailRaw}`);
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters long.");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set in your environment (.env).");
  }

  const email = emailRaw.toLowerCase();
  const hashedPassword = await hash(password, BCRYPT_COST);

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        role: Role.ADMIN,
      },
      create: {
        email,
        name,
        password: hashedPassword,
        role: Role.ADMIN,
      },
      select: { id: true, email: true, role: true },
    });

    const action = existing ? "Updated existing" : "Created new";
    console.log(`${action} admin user: ${user.email} (id: ${user.id})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(
    "Failed to create admin user:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
