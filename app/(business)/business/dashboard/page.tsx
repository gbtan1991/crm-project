import { auth } from "@/auth";

export default async function BusinessDashboardPage() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-zinc-100 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-medium text-zinc-500">Business</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
          Dashboard
        </h1>
        <p className="mt-2 text-zinc-600">
          Signed in as {session?.user.email}. Customers, bookings, invoices,
          and sequences will live here.
        </p>
      </div>
    </main>
  );
}
