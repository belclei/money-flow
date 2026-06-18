import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TransactionTable } from "@/components/transactions/table";
import { Pagination } from "@/components/transactions/pagination";
import { MonthSelector } from "@/components/dashboard/month-selector";

const LIMIT = 50;

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string; page?: string }>;
}

export default async function CardDetailPage({ params, searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const { id } = await params;
  const sp = await searchParams;
  const selectedMonth = sp.month ?? currentMonth();
  const page = Math.max(1, Number(sp.page ?? 1));

  const card = await prisma.creditCard.findUnique({
    where: { id },
    include: { debitAccount: { select: { name: true } } },
  });

  if (!card || card.userId !== session.user.id) notFound();

  const where = {
    invoice: { creditCardId: id },
    invoiceMonth: selectedMonth,
    amount: { gt: 0 },
    currency: "BRL",
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

  const totalBRL = transactions.reduce((s, t) => s + t.amount, 0);

  const available = card.creditLimit != null ? card.creditLimit - card.currentBill : null;
  const usedPct = card.creditLimit
    ? Math.min(100, (card.currentBill / card.creditLimit) * 100)
    : null;

  const selectedMonthLabel = (() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  })();

  return (
    <main className="container mx-auto max-w-5xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/cartoes" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Cartões
            </Link>
          </div>
          <h1 className="text-2xl font-semibold">{card.name}</h1>
          {card.institution && (
            <p className="text-sm text-muted-foreground">{card.institution}</p>
          )}
        </div>
        <Link href={`/upload?cartao=${id}`} className={cn(buttonVariants({ size: "sm" }))}>
          Importar fatura
        </Link>
      </div>

      {/* Card stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground mb-1">Fatura atual</p>
          <p className="text-xl font-semibold tabular-nums text-red-600">{formatBRL(card.currentBill)}</p>
        </div>
        {card.creditLimit != null && (
          <>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground mb-1">Disponível</p>
              <p className="text-xl font-semibold tabular-nums text-emerald-600">{formatBRL(available ?? 0)}</p>
            </div>
            <div className="rounded-lg border p-4 col-span-2">
              <p className="text-xs text-muted-foreground mb-2">
                Limite utilizado — {formatBRL(card.currentBill)} de {formatBRL(card.creditLimit)}
              </p>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-purple-500" style={{ width: `${usedPct}%` }} />
              </div>
            </div>
          </>
        )}
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground mb-1">Vencimento</p>
          <p className="text-lg font-semibold">Dia {card.dueDay}</p>
          {card.closingDay && <p className="text-xs text-muted-foreground">Fecha dia {card.closingDay}</p>}
        </div>
        {card.autoDebit && card.debitAccount && (
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground mb-1">Débito automático</p>
            <p className="text-sm font-medium">{card.debitAccount.name}</p>
          </div>
        )}
      </div>

      {/* Transactions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold">Transações</h2>
            <p className="text-sm text-muted-foreground mt-0.5 capitalize">
              {total} registro{total !== 1 ? "s" : ""}
              {totalBRL > 0 && ` · ${formatBRL(totalBRL)}`}
              {" — "}{selectedMonthLabel}
            </p>
          </div>
          <Suspense>
            <MonthSelector selected={selectedMonth} />
          </Suspense>
        </div>

        {transactions.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-muted-foreground text-sm">Nenhuma transação neste mês.</p>
            <Link href={`/upload?cartao=${id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 inline-flex")}>
              Importar fatura
            </Link>
          </div>
        ) : (
          <>
            <TransactionTable transactions={transactions} />
            <Suspense>
              <Pagination page={page} total={total} limit={LIMIT} />
            </Suspense>
          </>
        )}
      </div>
    </main>
  );
}
