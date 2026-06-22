import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { getBusinessForViewer } from "@/lib/business-context";

export default async function BusinessIdLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ businessId: string }>;
}>) {
  const [{ businessId }, session] = await Promise.all([params, auth()]);
  if (!session?.user) redirect("/");

  const business = await getBusinessForViewer(businessId, session.user);
  if (!business) notFound();

  return <div className="min-h-screen bg-background">{children}</div>;
}
