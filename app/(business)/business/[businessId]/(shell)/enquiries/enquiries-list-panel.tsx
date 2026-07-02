"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox } from "lucide-react";

import { EnquiryCard } from "@/app/(business)/business/[businessId]/(shell)/enquiries/enquiry-card";
import { EnquiryDetailDialog } from "@/app/(business)/business/[businessId]/(shell)/enquiries/enquiry-detail-dialog";
import { Card, CardContent } from "@/components/ui/card";
import type { EnquiryListRow } from "@/lib/enquiries";

export function EnquiriesListPanel({
  businessId,
  enquiries,
  timeZone,
}: {
  businessId: string;
  enquiries: EnquiryListRow[];
  timeZone: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<EnquiryListRow | null>(null);
  const [open, setOpen] = useState(false);

  function openEnquiry(enquiry: EnquiryListRow) {
    setSelected(enquiry);
    setOpen(true);

    if (enquiry.status === "NEW") {
      void fetch(`/api/business/${businessId}/enquiries/${enquiry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "READ" }),
      }).then(() => router.refresh());
    }
  }

  if (enquiries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <Inbox className="size-8 text-muted-foreground" />
          <p className="font-medium">Noch keine Anfragen</p>
          <p className="text-sm text-muted-foreground">
            Erstellen Sie ein Formular und senden Sie Einsendungen an die Webhook-URL, oder erfassen Sie eine Anfrage manuell.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {enquiries.map((enquiry) => (
          <EnquiryCard
            key={enquiry.id}
            businessId={businessId}
            enquiry={enquiry}
            timeZone={timeZone}
            onOpen={() => openEnquiry(enquiry)}
            onUpdated={() => router.refresh()}
          />
        ))}
      </div>

      <EnquiryDetailDialog
        key={selected?.id ?? "empty"}
        businessId={businessId}
        enquiry={selected}
        open={open}
        timeZone={timeZone}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setSelected(null);
          }
        }}
        onUpdated={() => router.refresh()}
      />
    </>
  );
}
