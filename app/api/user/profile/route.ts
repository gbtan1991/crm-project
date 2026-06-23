import { NextResponse } from "next/server";

import { ApiAuthError, requireAuthenticatedUser } from "@/lib/auth/guards";
import { updateUserProfile } from "@/lib/users";
import { updateUserProfileSchema } from "@/lib/validation/user-profile";

export async function PATCH(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await request.json().catch(() => null);
    const parsed = updateUserProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }

    const profile = await updateUserProfile(user.id, parsed.data);

    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[user/profile][PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 },
    );
  }
}
