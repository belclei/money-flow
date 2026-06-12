import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { TransactionTable } from "@/components/transactions/table";
import { TransactionFilters } from "@/components/transactions/filters";
import { Pagination } from "@/components/transactions/pagination";

const LIMIT = 30;

interface Props {
  searchParams: Promise<{
    page?: string;
    month?: string;
    category?: string;
    currency?: string;
    cardHolder?: string;
  }>;
}

export default async function TransactionsPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const where = {
    ...(params.month && { invoiceMonth: params.month }),
    ...(params.category && params.category !== "all" && { category: params.category }),
    ...(params.currency && params.currency !== "all" && { currency: params.currency }),
    ...(params.cardHolder && { cardHolder: { contains: params.cardHolder, mode: "insensitive" as const } }),
  };

  const [transactions, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * LIMIT,
      take: LIMIT,
      include: { purchase: true },
    }),
    prisma.transaction.count({ where }),
  ]);

  const totalExpenses = transactions
    .filter((t) => t.amount > 0 && t.currency === "BRL")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <main className="container mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Transações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} registro{total !== 1 ? "s" : ""}
            {totalExpenses > 0 && (
              <>
                {" · "}
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(totalExpenses)}{" "}
                nesta página
              </>
            )}
          </p>
        </div>
      </div>

      <Suspense>
        <TransactionFilters />
      </Suspense>

      <TransactionTable transactions={transactions} />

      <Suspense>
        <Pagination page={page} total={total} limit={LIMIT} />
      </Suspense>
    </main>
  );
}
