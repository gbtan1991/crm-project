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
        { error: "Upload a CSV file to import customers." },
        { status: 400 },
      );
    }

    if (file.size > MAX_CSV_BYTES) {
      return NextResponse.json(
        { error: "CSV file is too large. Upload a file under 512 KB." },
        { status: 400 },
      );
    }

    const csvText = await file.text();
    const result = await importCustomersFromCsv(businessId, csvText);

    if (result.created === 0 && result.failed > 0) {
      return NextResponse.json(
        { error: "No customers were imported.", result },
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
      { error: "Failed to import customers." },
      { status: 500 },
    );
  }
}
