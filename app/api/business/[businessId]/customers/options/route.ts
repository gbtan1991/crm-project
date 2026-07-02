import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import {
  CUSTOMER_COMBOBOX_RESULT_LIMIT,
  parseCustomerSearchParam,
  searchCustomerOptionsForBusiness,
} from "@/lib/customers";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const { searchParams } = new URL(request.url);
    const q = parseCustomerSearchParam(searchParams.get("q") ?? undefined);
    const limitParam = searchParams.get("limit");
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : NaN;
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), CUSTOMER_COMBOBOX_RESULT_LIMIT)
      : CUSTOMER_COMBOBOX_RESULT_LIMIT;

    const customers = await searchCustomerOptionsForBusiness(businessId, {
      q,
      limit,
    });

    return NextResponse.json({ customers });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/customers/options][GET]", error);
    return NextResponse.json(
      { error: "Kunden konnten nicht geladen werden." },
      { status: 500 },
    );
  }
}
