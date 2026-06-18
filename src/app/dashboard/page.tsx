import { Suspense } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MonthlyChart } from "@/components/dashboard/monthly-chart";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { BreakdownBar } from "@/components/dashboard/breakdown-bar";
import { MonthSelector } from "@/components/dashboard/month-selector";
import { calcNetWorth, calcFreeMoney, calcMonthForecast } from "@/lib/calculations/financial";
import { transactionVisibilityWhere, accountVisibilityWhere } from "@/lib/visibility";

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(v);
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function last6MonthsFrom(base: string) {
  const [year, month] = base.split("-").map(Number);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(year, month - 1 - (5 - i), 1);
    return {
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
    };
  });
}

function prevMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function getFinancialSnapshot(userId: string) {
  const accWhere = await accountVisibilityWhere(userId);
  const [accounts, recurrings] = await Promise.all([
    prisma.account.findMany({ where: accWhere }),
    prisma.recurringTransaction.findMany({ where: { userId } }),
  ]);

  const netWorth = calcNetWorth(accounts);
  const freeMoney = calcFreeMoney(accounts, recurrings);
  const forecast = calcMonthForecast(accounts, recurrings);
  const hasAccounts = accounts.length > 0;

  return { netWorth, freeMoney, forecast, hasAccounts };
}

async function getSpendingData(selectedMonth: string, userId: string) {
  const previousMonth = prevMonth(selectedMonth);
  const months = last6MonthsFrom(selectedMonth);
  const vis = await transactionVisibilityWhere(userId);

  const [selectedTxs, prevTxs, monthlyRaw, categoryRaw, bankRaw, holderRaw] =
    await Promise.all([
      prisma.transaction.findMany({
        where: { AND: [vis, { invoiceMonth: selectedMonth, amount: { gt: 0 }, currency: "BRL" }] },
        select: { amount: true },
      }),
      prisma.transaction.findMany({
        where: { AND: [vis, { invoiceMonth: previousMonth, amount: { gt: 0 }, currency: "BRL" }] },
        select: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["invoiceMonth"],
        where: {
          AND: [vis, { invoiceMonth: { in: months.map((m) => m.month) }, amount: { gt: 0 }, currency: "BRL" }],
        },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["category"],
        where: { AND: [vis, { invoiceMonth: selectedMonth, amount: { gt: 0 }, currency: "BRL" }] },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
      }),
      prisma.transaction.groupBy({
        by: ["cardBrand"],
        where: { AND: [vis, { invoiceMonth: selectedMonth, amount: { gt: 0 }, currency: "BRL" }] },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
      }),
      prisma.transaction.groupBy({
        by: ["cardHolder"],
        where: { AND: [vis, { invoiceMonth: selectedMonth, amount: { gt: 0 }, currency: "BRL" }] },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
      }),
    ]);

  const total = selectedTxs.reduce((s, t) => s + t.amount, 0);
  const count = selectedTxs.length;
  const avg = count > 0 ? total / count : 0;
  const prevTotal = prevTxs.reduce((s, t) => s + t.amount, 0);
  const prevCount = prevTxs.length;
  const totalDelta = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;
  const countDelta = prevCount > 0 ? count - prevCount : null;

  const monthlyMap = new Map(monthlyRaw.map((r) => [r.invoiceMonth, r._sum.amount ?? 0]));
  const monthlyData = months.map((m) => ({
    month: m.month,
    label: m.label,
    total: monthlyMap.get(m.month) ?? 0,
  }));

  const categoryData = categoryRaw.map((r) => ({
    category: r.category ?? "outros",
    total: r._sum.amount ?? 0,
  }));

  const bankData = bankRaw
    .filter((r) => r.cardBrand)
    .map((r) => ({ label: r.cardBrand!, total: r._sum.amount ?? 0 }));

  const holderData = holderRaw
    .filter((r) => r.cardHolder)
    .map((r) => ({ label: r.cardHolder!, total: r._sum.amount ?? 0 }));

  return { total, count, avg, prevTotal, totalDelta, countDelta, monthlyData, categoryData, bankData, holderData };
}

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const params = await searchParams;
  const selectedMonth = params.month ?? currentMonth();

  const [snapshot, spending] = await Promise.all([
    getFinancialSnapshot(session.user.id),
    getSpendingData(selectedMonth, session.user.id),
  ]);

  const selectedMonthLabel = (() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  })();

  const { freeMoney, forecast, netWorth, hasAccounts } = snapshot;

  return (
    <main className="container mx-auto max-w-5xl p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex gap-2 flex-wrap items-center">
          <Link href="/accounts" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Contas
          </Link>
          <Link href="/categories" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Categorias
          </Link>
          <Link href="/recurring" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Recorrências
          </Link>
          <Link href="/transactions" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Transações
          </Link>
          <Link href="/upload" className={cn(buttonVariants({ size: "sm" }))}>
            Importar fatura
          </Link>
        </div>
      </div>

      {/* ── Financial health cards (always current, not month-filtered) ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Situação atual
        </h2>

        {!hasAccounts && (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <Link href="/accounts" className="underline underline-offset-4">Cadastre suas contas</Link>
            {" "}para ver sua situação financeira real aqui.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className={cn("border-2", freeMoney.total >= 0 ? "border-emerald-500/30" : "border-red-400/30")}>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Disponível hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn("text-2xl font-semibold tabular-nums", freeMoney.total >= 0 ? "text-emerald-600" : "text-red-600")}>
                {formatBRL(freeMoney.total)}
              </p>
              <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                <p>{formatBRL(freeMoney.liquidBalance)} em conta</p>
                {freeMoney.creditDebt > 0 && (
                  <p className="text-red-500">− {formatBRL(freeMoney.creditDebt)} faturas</p>
                )}
                {freeMoney.remainingExpenses > 0 && (
                  <p className="text-orange-500">− {formatBRL(freeMoney.remainingExpenses)} fixas restantes</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Patrimônio total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn("text-2xl font-semibold tabular-nums", netWorth < 0 ? "text-red-600" : "")}>
                {formatBRL(netWorth)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">Todas as contas e investimentos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Previsão fim do mês</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn("text-2xl font-semibold tabular-nums", forecast.total < 0 ? "text-red-600" : "")}>
                {formatBRL(forecast.total)}
              </p>
              <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {forecast.remainingIncome > 0 && (
                  <p className="text-emerald-600">+ {formatBRL(forecast.remainingIncome)} a receber</p>
                )}
                <p>Após receitas e despesas fixas restantes</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Spending analytics (month-filtered) ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground capitalize">
            Gastos — {selectedMonthLabel}
          </h2>
          <Suspense>
            <MonthSelector selected={selectedMonth} />
          </Suspense>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total do mês</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{formatBRL(spending.total)}</p>
              {spending.totalDelta !== null && (
                <p className={`text-xs mt-1 tabular-nums ${spending.totalDelta > 0 ? "text-red-500" : "text-green-600"}`}>
                  {spending.totalDelta > 0 ? "▲" : "▼"} {Math.abs(spending.totalDelta).toFixed(1)}% vs mês anterior
                </p>
              )}
              {spending.prevTotal > 0 && (
                <p className="text-xs text-muted-foreground">{formatBRL(spending.prevTotal)} no mês anterior</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Transações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{spending.count}</p>
              {spending.countDelta !== null && spending.countDelta !== 0 && (
                <p className={`text-xs mt-1 ${spending.countDelta > 0 ? "text-muted-foreground" : "text-green-600"}`}>
                  {spending.countDelta > 0 ? "+" : ""}{spending.countDelta} vs mês anterior
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ticket médio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{formatBRL(spending.avg)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Últimos 6 meses</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense>
                <MonthlyChart data={spending.monthlyData} />
              </Suspense>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Por categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense>
                <CategoryChart data={spending.categoryData} />
              </Suspense>
            </CardContent>
          </Card>
        </div>

        {(spending.bankData.length > 0 || spending.holderData.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {spending.bankData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Por banco</CardTitle>
                </CardHeader>
                <CardContent>
                  <BreakdownBar data={spending.bankData} />
                </CardContent>
              </Card>
            )}
            {spending.holderData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Por portador</CardTitle>
                </CardHeader>
                <CardContent>
                  <BreakdownBar data={spending.holderData} />
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
