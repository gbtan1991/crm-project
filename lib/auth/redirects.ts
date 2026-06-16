import { Role } from "@/lib/generated/prisma/client";

export function getDashboardPath(role: Role) {
  return role === Role.ADMIN ? "/admin/dashboard" : "/business/dashboard";
}
