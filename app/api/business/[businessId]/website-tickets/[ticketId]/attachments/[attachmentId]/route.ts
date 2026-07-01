import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import { getWebsiteTicketAttachmentForBusiness } from "@/lib/website-tickets";

type RouteContext = {
  params: Promise<{
    businessId: string;
    ticketId: string;
    attachmentId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { businessId, ticketId, attachmentId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const attachment = await getWebsiteTicketAttachmentForBusiness({
      businessId,
      ticketId,
      attachmentId,
    });

    if (!attachment) {
      return NextResponse.json({ error: "Anhang nicht gefunden." }, { status: 404 });
    }

    return new NextResponse(attachment.data, {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Disposition": `inline; filename="${attachment.fileName}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/website-ticket-attachments][GET]", error);
    return NextResponse.json(
      { error: "Anhang konnte nicht geladen werden." },
      { status: 500 },
    );
  }
}
