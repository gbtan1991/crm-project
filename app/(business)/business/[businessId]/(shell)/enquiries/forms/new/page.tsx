import { notFound } from "next/navigation";

import { FormEditor } from "@/app/(business)/business/[businessId]/(shell)/enquiries/form-editor";
import { PageHeader } from "@/app/(business)/business/page-header";
import { auth } from "@/auth";
import { getBusinessForViewer } from "@/lib/business-context";
import { getFormForBusiness } from "@/lib/forms";

type PageProps = {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export default async function NewEnquiryFormPage({
  params,
  searchParams,
}: PageProps) {
  const { businessId } = await params;
  const query = await searchParams;
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const business = await getBusinessForViewer(businessId, session.user);
  if (!business) {
    notFound();
  }

  const editId = query.edit;
  const form =
    editId && editId !== "new"
      ? await getFormForBusiness(businessId, editId)
      : null;

  if (editId && editId !== "new" && !form) {
    notFound();
  }

  return (
    <div>
      <PageHeader
        title={form ? `${form.name} bearbeiten` : "Neues Formular"}
        subtitle="Definieren Sie die Felder, die Ihr Webhook akzeptiert"
      />
      <FormEditor businessId={businessId} form={form ?? undefined} />
    </div>
  );
}
