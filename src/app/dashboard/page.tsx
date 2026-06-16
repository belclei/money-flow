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

async function getDashboardData(selectedMonth: string) {
  const months = last6MonthsFrom(selectedMonth);

  const [selectedTxs, monthlyRaw, categoryRaw, bankRaw, holderRaw] =
    await Promise.all([
      prisma.transaction.findMany({
        where: { invoiceMonth: selectedMonth, amount: { gt: 0 }, currency: "BRL" },
        select: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["invoiceMonth"],
        where: {
          invoiceMonth: { in: months.map((m) => m.month) },
          amount: { gt: 0 },
          currency: "BRL",
        },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["category"],
        where: { invoiceMonth: selectedMonth, amount: { gt: 0 }, currency: "BRL" },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
      }),
      prisma.transaction.groupBy({
        by: ["cardBrand"],
        where: { invoiceMonth: selectedMonth, amount: { gt: 0 }, currency: "BRL" },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
      }),
      prisma.transaction.groupBy({
        by: ["cardHolder"],
        where: { invoiceMonth: selectedMonth, amount: { gt: 0 }, currency: "BRL" },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
      }),
    ]);

  const total = selectedTxs.reduce((s, t) => s + t.amount, 0);
  const count = selectedTxs.length;
  const avg = count > 0 ? total / count : 0;

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

  return { total, count, avg, monthlyData, categoryData, bankData, holderData };
}

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const params = await searchParams;
  const selectedMonth = params.month ?? currentMonth();

  const data = await getDashboardData(selectedMonth);

  const selectedMonthLabel = (() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  })();

  return (
    <main className="container mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground capitalize">{selectedMonthLabel}</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Suspense>
            <MonthSelector selected={selectedMonth} />
          </Suspense>
          <Link href="/transactions" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Transações
          </Link>
          <Link href="/upload" className={cn(buttonVariants({ size: "sm" }))}>
            Importar fatura
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total do mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{formatBRL(data.total)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Transações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{data.count}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ticket médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{formatBRL(data.avg)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly trend + category */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense>
              <MonthlyChart data={data.monthlyData} />
            </Suspense>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense>
              <CategoryChart data={data.categoryData} />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      {/* Bank + cardholder breakdown */}
      {(data.bankData.length > 0 || data.holderData.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.bankData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Por banco</CardTitle>
              </CardHeader>
              <CardContent>
                <BreakdownBar data={data.bankData} />
              </CardContent>
            </Card>
          )}
          {data.holderData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Por portador</CardTitle>
              </CardHeader>
              <CardContent>
                <BreakdownBar data={data.holderData} />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </main>
  );
}
