import { NextResponse } from "next/server";

import { ApiAuthError, requireAdmin } from "@/lib/auth/guards";
import { deleteUser } from "@/lib/businesses";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const result = await deleteUser(id, admin.id);
    if (!result.ok) {
      const status = result.error === "Benutzer nicht gefunden." ? 404 : 409;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[admin/users/:id][DELETE]", error);
    return NextResponse.json({ error: "Es ist ein Fehler aufgetreten." }, { status: 500 });
  }
}
