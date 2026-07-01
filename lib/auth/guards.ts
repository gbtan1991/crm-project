import { auth } from "@/auth";
import { getBusinessForOwner } from "@/lib/business-context";
import { Role } from "@/lib/generated/prisma/client";

export class ApiAuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiAuthError";
    this.status = status;
  }
}

type SessionUser = {
  id: string;
  role: Role;
  businessId: string | null;
  email?: string | null;
  name?: string | null;
};

export async function requireAdmin(): Promise<SessionUser> {
  const session = await auth();

  if (!session?.user) {
    throw new ApiAuthError(401, "Anmeldung erforderlich.");
  }
  if (session.user.role !== Role.ADMIN) {
    throw new ApiAuthError(403, "Admin-Zugriff erforderlich.");
  }

  return session.user;
}

export async function requireAuthenticatedUser(): Promise<SessionUser> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new ApiAuthError(401, "Anmeldung erforderlich.");
  }

  return session.user;
}

/**
 * Ensures the current user owns the business in the URL.
 */
export async function requireBusinessOwner(businessId: string) {
  const session = await auth();

  if (!session?.user) {
    throw new ApiAuthError(401, "Anmeldung erforderlich.");
  }
  if (session.user.role !== Role.BUSINESS) {
    throw new ApiAuthError(403, "Unternehmenszugriff erforderlich.");
  }

  const business = await getBusinessForOwner(businessId, session.user.id);
  if (!business) {
    throw new ApiAuthError(404, "Unternehmen nicht gefunden.");
  }

  return { user: session.user, business };
}

/**
 * Ensures the current user is either the business owner or an admin.
 * Admins bypass the ownership check and can view any business's data.
 */
export async function requireBusinessOwnerOrAdmin(businessId: string) {
  const session = await auth();

  if (!session?.user) {
    throw new ApiAuthError(401, "Anmeldung erforderlich.");
  }

  if (session.user.role === Role.ADMIN) {
    return { user: session.user, business: null };
  }

  if (session.user.role !== Role.BUSINESS) {
    throw new ApiAuthError(403, "Admin- oder Unternehmenszugriff erforderlich.");
  }

  const business = await getBusinessForOwner(businessId, session.user.id);
  if (!business) {
    throw new ApiAuthError(404, "Unternehmen nicht gefunden.");
  }

  return { user: session.user, business };
}
