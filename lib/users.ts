import { compare, hash } from "bcryptjs";

import { prisma } from "@/lib/prisma";
import type {
  ChangePasswordInput,
  UpdateUserProfileInput,
} from "@/lib/validation/user-profile";

const BCRYPT_COST = 12;

export async function updateUserProfile(userId: string, input: UpdateUserProfileInput) {
  return prisma.user.update({
    where: { id: userId },
    data: { name: input.name },
    select: { id: true, name: true, email: true },
  });
}

export async function changeUserPassword(
  userId: string,
  input: ChangePasswordInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  if (!user) {
    return { ok: false, error: "Benutzer nicht gefunden." };
  }

  const validPassword = await compare(input.currentPassword, user.password);
  if (!validPassword) {
    return { ok: false, error: "Aktuelles Passwort ist falsch." };
  }

  const nextPassword = await hash(input.newPassword, BCRYPT_COST);

  await prisma.user.update({
    where: { id: userId },
    data: { password: nextPassword },
  });

  return { ok: true };
}
