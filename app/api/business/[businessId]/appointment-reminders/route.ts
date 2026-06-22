import { NextResponse } from "next/server";

import { ApiAuthError, requireBusinessOwnerOrAdmin } from "@/lib/auth/guards";
import {
  getAppointmentReminderSettings,
  updateAppointmentReminderSettings,
} from "@/lib/appointment-reminders";
import { appointmentReminderSettingsSchema } from "@/lib/validation/appointment-reminder";

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const settings = await getAppointmentReminderSettings(businessId);
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/appointment-reminders][GET]", error);
    return NextResponse.json(
      { error: "Failed to load appointment reminder settings." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params;
    await requireBusinessOwnerOrAdmin(businessId);

    const body = await request.json().catch(() => null);
    const parsed = appointmentReminderSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }

    const settings = await updateAppointmentReminderSettings(
      businessId,
      parsed.data,
    );
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[business/appointment-reminders][PUT]", error);
    return NextResponse.json(
      { error: "Failed to save appointment reminder settings." },
      { status: 500 },
    );
  }
}
