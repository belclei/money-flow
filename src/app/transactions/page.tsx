import { Suspense } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { TransactionTable } from "@/components/transactions/table";
import { TransactionFilters } from "@/components/transactions/filters";
import { Pagination } from "@/components/transactions/pagination";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { transactionVisibilityWhere } from "@/lib/visibility";

const LIMIT = 50;

interface Props {
  searchParams: Promise<{
    page?: string;
    month?: string;
    category?: string;
    currency?: string;
    cardHolder?: string;
    cardBrand?: string;
    groupBy?: "bank" | "holder";
    creditCardId?: string;
    accountId?: string;
  }>;
}

export default async function TransactionsPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const groupBy = params.groupBy;

  const visibilityWhere = await transactionVisibilityWhere(session.user.id);

  const where = {
    AND: [
      visibilityWhere,
      {
        ...(params.month && { invoiceMonth: params.month }),
        ...(params.category && params.category !== "all" && { category: params.category }),
        ...(params.currency && params.currency !== "all" && { currency: params.currency }),
        ...(params.cardHolder && { cardHolder: { contains: params.cardHolder, mode: "insensitive" as const } }),
        ...(params.cardBrand && { cardBrand: { contains: params.cardBrand, mode: "insensitive" as const } }),
        ...(params.creditCardId && { invoice: { creditCardId: params.creditCardId } }),
        ...(params.accountId && { accountId: params.accountId }),
      },
    ],
  };

  const orderBy =
    groupBy === "bank"
      ? [{ cardBrand: "asc" as const }, { date: "desc" as const }]
      : groupBy === "holder"
      ? [{ cardHolder: "asc" as const }, { date: "desc" as const }]
      : [{ date: "desc" as const }];

  const [creditCard, account] = await Promise.all([
    params.creditCardId
      ? prisma.creditCard.findUnique({ where: { id: params.creditCardId }, select: { name: true } })
      : null,
    params.accountId
      ? prisma.account.findUnique({ where: { id: params.accountId }, select: { name: true } })
      : null,
  ]);

  const [transactions, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where,
      orderBy,
      skip: (page - 1) * LIMIT,
      take: LIMIT,
      include: { purchase: true },
    }),
    prisma.transaction.count({ where }),
  ]);

  const totalBRL = transactions
    .filter((t) => t.amount > 0 && t.currency === "BRL")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <main className="container mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {creditCard ? `Transações — ${creditCard.name}` : account ? `Transações — ${account.name}` : "Transações"}
          </h1>

          <p className="text-sm text-muted-foreground mt-1">
            {total} registro{total !== 1 ? "s" : ""}
            {totalBRL > 0 && (
              <>
                {" · "}
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(totalBRL)}{" "}
                nesta página
              </>
            )}
          </p>
        </div>
        {session.user.role === "admin" && (
          <Link
            href="/transactions/new"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            + Nova transação
          </Link>
        )}
      </div>

      <Suspense>
        <TransactionFilters />
      </Suspense>

      <TransactionTable transactions={transactions} groupBy={groupBy} />

      <Suspense>
        <Pagination page={page} total={total} limit={LIMIT} />
      </Suspense>
    </main>
  );
}
