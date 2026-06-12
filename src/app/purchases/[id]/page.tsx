import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(v);
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("pt-BR");
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PurchaseDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const { id } = await params;

  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      transactions: {
        orderBy: [{ installmentNumber: "asc" }, { date: "asc" }],
      },
    },
  });

  if (!purchase) notFound();

  const paidInstallments = purchase.transactions.length;
  const totalPaid = purchase.transactions.reduce((s, t) => s + t.amount, 0);
  const totalExpected = purchase.totalAmount ?? purchase.installmentCount * (totalPaid / paidInstallments || 0);
  const remaining = totalExpected - totalPaid;
  const progressPct = Math.round((paidInstallments / purchase.installmentCount) * 100);
  const isBRL = purchase.currency === "BRL";

  return (
    <main className="container mx-auto max-w-3xl p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Compra parcelada</p>
          <h1 className="text-2xl font-semibold">{purchase.description}</h1>
          {purchase.cardHolder && (
            <p className="text-sm text-muted-foreground mt-1">{purchase.cardHolder}</p>
          )}
        </div>
        <Link href="/transactions" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          ← Transações
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground font-medium">Parcelas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{paidInstallments}/{purchase.installmentCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground font-medium">Total pago</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold tabular-nums">
              {isBRL ? formatBRL(totalPaid) : `${totalPaid.toFixed(2)} ${purchase.currency}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground font-medium">Restante</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold tabular-nums text-muted-foreground">
              {isBRL ? formatBRL(remaining) : `${remaining.toFixed(2)} ${purchase.currency}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground font-medium">Total estimado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold tabular-nums">
              {isBRL ? formatBRL(totalExpected) : `${totalExpected.toFixed(2)} ${purchase.currency}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{progressPct}% pago</span>
          <span className="text-muted-foreground">
            {purchase.installmentCount - paidInstallments} parcela{purchase.installmentCount - paidInstallments !== 1 ? "s" : ""} restante{purchase.installmentCount - paidInstallments !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Installment list */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Parcelas importadas</h2>
        <div className="rounded-lg border divide-y">
          {purchase.transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="tabular-nums w-10 justify-center">
                  {t.installmentNumber ?? "—"}/{purchase.installmentCount}
                </Badge>
                <div>
                  <p className="text-sm">{formatDate(t.date)}</p>
                  <p className="text-xs text-muted-foreground">{t.invoiceMonth ?? "—"}</p>
                </div>
              </div>
              <span className="text-sm font-medium tabular-nums">
                {isBRL
                  ? formatBRL(t.amount)
                  : `${t.amount.toFixed(2)} ${t.currency}`}
              </span>
            </div>
          ))}

          {/* Missing installments */}
          {Array.from(
            { length: purchase.installmentCount - paidInstallments },
            (_, i) => paidInstallments + i + 1
          ).map((n) => (
            <div key={`missing-${n}`} className="flex items-center justify-between px-4 py-3 opacity-40">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="tabular-nums w-10 justify-center">
                  {n}/{purchase.installmentCount}
                </Badge>
                <p className="text-sm text-muted-foreground">Não importada</p>
              </div>
              <span className="text-sm text-muted-foreground tabular-nums">
                {isBRL
                  ? formatBRL(totalPaid / paidInstallments)
                  : `${(totalPaid / paidInstallments).toFixed(2)} ${purchase.currency}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
