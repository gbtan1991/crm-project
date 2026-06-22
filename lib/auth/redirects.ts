import { Role } from "@/lib/generated/prisma/client";
import { businessDashboardPath } from "@/lib/business-paths";

export function getDashboardPath(
  role: Role,
  businessId?: string | null,
): string {
  if (role === Role.ADMIN) {
    return "/admin/dashboard";
  }
  if (businessId) {
    return businessDashboardPath(businessId);
  }
  return "/business";
}
