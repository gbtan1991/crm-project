import { FinanceNav } from "@/app/(business)/business/finance-nav";

export default async function FinanceLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ businessId: string }>;
}>) {
  const { businessId } = await params;

  return (
    <div>
      <FinanceNav businessId={businessId} />
      {children}
    </div>
  );
}
