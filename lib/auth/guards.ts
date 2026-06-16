import { auth } from "@/auth";
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

/**
 * Ensures the current request is made by an authenticated ADMIN.
 * Throws ApiAuthError (401/403) otherwise — handlers map this to a Response.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await auth();

  if (!session?.user) {
    throw new ApiAuthError(401, "Authentication required.");
  }
  if (session.user.role !== Role.ADMIN) {
    throw new ApiAuthError(403, "Admin access required.");
  }

  return session.user;
}
