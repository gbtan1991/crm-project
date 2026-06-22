"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type ImportResult = {
  created: number;
  skippedDuplicates: number;
  skippedEmpty: number;
  failed: number;
  totalRows: number;
  errors: string[];
};

export function ImportCustomersButton({ businessId }: { businessId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/business/${businessId}/customers/import`, {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        result?: ImportResult;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to import customers.");
      }

      const result = data.result;
      if (!result) {
        throw new Error("Failed to import customers.");
      }

      const skipped =
        result.skippedDuplicates + result.skippedEmpty + result.failed;
      toast.success(
        skipped > 0
          ? `Imported ${result.created} customer${result.created === 1 ? "" : "s"}; skipped ${skipped}.`
          : `Imported ${result.created} customer${result.created === 1 ? "" : "s"}.`,
      );

      if (result.errors.length > 0) {
        toast.warning(result.errors.slice(0, 3).join(" "));
      }
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to import customers.",
      );
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" asChild>
        <a href="/customer-import-template.csv" download>
          <Download className="size-4" />
          Sample CSV
        </a>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={importing}
        onClick={() => inputRef.current?.click()}
      >
        {importing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Upload className="size-4" />
        )}
        Import CSV
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(event) => void handleImport(event)}
      />
    </div>
  );
}
