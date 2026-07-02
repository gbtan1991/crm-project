"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type CustomerFormValues = {
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  status: "ACTIVE" | "INACTIVE";
  notes: string;
};

export const emptyCustomerForm: CustomerFormValues = {
  companyName: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  postalCode: "",
  city: "",
  status: "ACTIVE",
  notes: "",
};

export function CustomerFormFields({
  values,
  onChange,
  idPrefix = "",
}: {
  values: CustomerFormValues;
  onChange: (values: CustomerFormValues) => void;
  idPrefix?: string;
}) {
  const id = (field: string) => (idPrefix ? `${idPrefix}-${field}` : field);
  const set = <K extends keyof CustomerFormValues>(key: K, value: CustomerFormValues[K]) =>
    onChange({ ...values, [key]: value });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={id("companyName")}>Firma</Label>
        <Input
          id={id("companyName")}
          value={values.companyName}
          onChange={(e) => set("companyName", e.target.value)}
          placeholder="z. B. Mustermann Bedachungen GmbH"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={id("firstName")}>Vorname</Label>
          <Input
            id={id("firstName")}
            value={values.firstName}
            onChange={(e) => set("firstName", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={id("lastName")}>Nachname</Label>
          <Input
            id={id("lastName")}
            value={values.lastName}
            onChange={(e) => set("lastName", e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={id("email")}>E-Mail *</Label>
          <Input
            id={id("email")}
            type="email"
            required
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="customer@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={id("phone")}>Telefon</Label>
          <Input
            id={id("phone")}
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+41 44 123 45 67"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={id("address")}>Adresse</Label>
        <Input
          id={id("address")}
          value={values.address}
          onChange={(e) => set("address", e.target.value)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={id("postalCode")}>PLZ</Label>
          <Input
            id={id("postalCode")}
            value={values.postalCode}
            onChange={(e) => set("postalCode", e.target.value)}
          />
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor={id("city")}>Ort</Label>
          <Input
            id={id("city")}
            value={values.city}
            onChange={(e) => set("city", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={id("status")}>Status</Label>
        <Select
          value={values.status}
          onValueChange={(value: "ACTIVE" | "INACTIVE") => set("status", value)}
        >
          <SelectTrigger id={id("status")} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Aktiv</SelectItem>
            <SelectItem value="INACTIVE">Inaktiv</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={id("notes")}>Notizen</Label>
        <Textarea
          id={id("notes")}
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          className="min-h-20"
        />
      </div>
    </div>
  );
}
