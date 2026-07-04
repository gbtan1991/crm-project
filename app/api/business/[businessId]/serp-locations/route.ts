import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import {
  getDefaultCountryLocation,
  searchSerpLocations,
  SERP_LOCATION_SEARCH_LIMIT,
} from "@/lib/seo-visibility/serp-locations";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { config: true },
    });
    if (!business) {
      return NextResponse.json({ error: "Unternehmen nicht gefunden." }, { status: 404 });
    }

    const country = business.config?.country ?? "CH";
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const limitParam = searchParams.get("limit");
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : NaN;
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), SERP_LOCATION_SEARCH_LIMIT)
      : SERP_LOCATION_SEARCH_LIMIT;

    const defaultLocation = getDefaultCountryLocation(country);
    const locations = searchSerpLocations({ country, query: q, limit });

    return NextResponse.json({
      country,
      defaultLocation,
      locations,
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/serp-locations][GET]", error);
    return NextResponse.json(
      { error: "Standorte konnten nicht geladen werden." },
      { status: 500 },
    );
  }
}
