import { NextResponse } from "next/server";

import { ApiAuthError, requireAdmin } from "@/lib/auth/guards";
import { createAdmin, createBusiness } from "@/lib/businesses";
import { createUserSchema } from "@/lib/validation/user";

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json().catch(() => null);
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const result =
      data.role === "ADMIN"
        ? await createAdmin({
            name: data.name,
            email: data.email,
            password: data.password,
          })
        : await createBusiness({
            name: data.businessName,
            ownerName: data.name,
            ownerEmail: data.email,
            ownerPassword: data.password,
          });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[admin/users][POST]", error);
    return NextResponse.json({ error: "Es ist ein Fehler aufgetreten." }, { status: 500 });
  }
}
