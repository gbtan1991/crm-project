import { NextResponse } from "next/server";

import { createEnquiryFromWebhook } from "@/lib/enquiries";

type RouteContext = {
  params: Promise<{ token: string }>;
};

const WEBHOOK_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: WEBHOOK_HEADERS,
  });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const payload = await request.json().catch(() => null);

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return NextResponse.json(
        { error: "Anfragekörper muss ein JSON-Objekt sein." },
        { status: 400, headers: WEBHOOK_HEADERS },
      );
    }

    const result = await createEnquiryFromWebhook(token, payload);

    if ("error" in result) {
      const status = result.error?.includes("not found") ? 404 : 400;
      return NextResponse.json(
        { error: result.error },
        { status, headers: WEBHOOK_HEADERS },
      );
    }

    return NextResponse.json(
      { ok: true, enquiryId: result.enquiry.id },
      { status: 201, headers: WEBHOOK_HEADERS },
    );
  } catch (error) {
    console.error("[webhooks/enquiries/:token][POST]", error);
    return NextResponse.json(
      { error: "Anfrage konnte nicht erstellt werden." },
      { status: 500, headers: WEBHOOK_HEADERS },
    );
  }
}
