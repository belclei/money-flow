import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { RecurringClient } from "@/components/recurring/recurring-client";

interface Props {
  searchParams: Promise<{ accountId?: string }>;
}

export default async function RecurringPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const params = await searchParams;

  const [recurrings, accounts, categories] = await Promise.all([
    prisma.recurringTransaction.findMany({
      where: {
        userId: session.user.id,
        ...(params.accountId && { accountId: params.accountId }),
      },
      include: { account: true, category: true },
      orderBy: [{ kind: "asc" }, { dayOfMonth: "asc" }],
    }),
    prisma.account.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { OR: [{ userId: session.user.id }, { userId: null }] },
      orderBy: { name: "asc" },
    }),
  ]);

  const accountName = params.accountId
    ? (accounts.find((a) => a.id === params.accountId)?.name ?? null)
    : null;

  return (
    <main className="container mx-auto max-w-2xl p-6 space-y-6">
      <RecurringClient
        initialRecurrings={recurrings}
        accounts={accounts}
        categories={categories}
        accountFilter={accountName}
      />
    </main>
  );
}
