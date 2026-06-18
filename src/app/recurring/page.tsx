import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { RecurringClient } from "@/components/recurring/recurring-client";

export default async function RecurringPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const [recurrings, accounts, categories] = await Promise.all([
    prisma.recurringTransaction.findMany({
      where: { userId: session.user.id },
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

  return (
    <main className="container mx-auto max-w-2xl p-6 space-y-6">
      <RecurringClient
        initialRecurrings={recurrings}
        accounts={accounts}
        categories={categories}
      />
    </main>
  );
}
