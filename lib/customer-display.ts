export function formatCustomerName(customer: {
  companyName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string;
}) {
  const person = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return customer.companyName || person || customer.email || "Unnamed customer";
}

export function formatCustomerPersonName(customer: {
  firstName?: string | null;
  lastName?: string | null;
}) {
  return [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim();
}

export function customerInitials(customer: {
  companyName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}) {
  const name = formatCustomerName(customer);
  return name.slice(0, 2).toUpperCase();
}

export function formatCustomerSince(
  createdAt: string,
  timeZone?: string,
): string {
  return new Date(createdAt).toLocaleDateString(undefined, {
    timeZone,
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
