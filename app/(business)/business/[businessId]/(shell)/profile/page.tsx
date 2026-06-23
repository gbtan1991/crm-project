import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/app/(business)/business/page-header";
import { auth } from "@/auth";
import { getBusinessForViewer } from "@/lib/business-context";
import { resolveBusinessProfileTab } from "@/lib/business-paths";
import { prisma } from "@/lib/prisma";

import { ProfileDetailsForm } from "./profile-details-form";
import { ProfilePasswordForm } from "./profile-password-form";
import { ProfileTabNav } from "./profile-tab-nav";

type PageProps = {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function ProfilePage({ params, searchParams }: PageProps) {
  const { businessId } = await params;
  const { tab } = await searchParams;
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const business = await getBusinessForViewer(businessId, session.user);
  if (!business) {
    notFound();
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  });

  if (!user) {
    notFound();
  }

  const showPassword = resolveBusinessProfileTab(tab) === "password";

  return (
    <div>
      <PageHeader
        title="Profile"
        subtitle="Manage your account details and password."
      />

      <Suspense fallback={null}>
        <ProfileTabNav businessId={businessId} />
      </Suspense>

      {showPassword ? (
        <ProfilePasswordForm />
      ) : (
        <ProfileDetailsForm
          initialName={user.name?.trim() || ""}
          email={user.email}
        />
      )}
    </div>
  );
}
