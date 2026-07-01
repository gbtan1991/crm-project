import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import { importCustomersFromCsv } from "@/lib/customer-import";

const MAX_CSV_BYTES = 512 * 1024;

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Laden Sie eine CSV-Datei hoch, um Kunden zu importieren." },
        { status: 400 },
      );
    }

    if (file.size > MAX_CSV_BYTES) {
      return NextResponse.json(
        { error: "CSV-Datei ist zu gross. Laden Sie eine Datei unter 512 KB hoch." },
        { status: 400 },
      );
    }

    const csvText = await file.text();
    const result = await importCustomersFromCsv(businessId, csvText);

    if (result.created === 0 && result.failed > 0) {
      return NextResponse.json(
        { error: "Es wurden keine Kunden importiert.", result },
        { status: 400 },
      );
    }

    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/customers/import][POST]", error);
    return NextResponse.json(
      { error: "Kunden konnten nicht importiert werden." },
      { status: 500 },
    );
  }
}
