import { formatCustomerName } from "@/lib/customer-display";

export type CalendarEventCustomer = {
  id: string;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
} | null;

export type CalendarEventPayload = {
  title: string;
  startsAt: Date;
  endsAt: Date;
  location: string | null;
  notes: string | null;
  timeZone: string;
  customer: CalendarEventCustomer;
};

export function calendarEventAttendees(customer: CalendarEventCustomer) {
  if (!customer) {
    return [];
  }

  return [
    {
      email: customer.email,
      name: formatCustomerName(customer),
    },
  ];
}
