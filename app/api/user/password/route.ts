import { NextResponse } from "next/server";

import { ApiAuthError, requireAuthenticatedUser } from "@/lib/auth/guards";
import { changeUserPassword } from "@/lib/users";
import { changePasswordSchema } from "@/lib/validation/user-profile";

export async function PATCH(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await request.json().catch(() => null);
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }

    const result = await changeUserPassword(user.id, parsed.data);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[user/password][PATCH]", error);
    return NextResponse.json(
      { error: "Failed to change password." },
      { status: 500 },
    );
  }
}
