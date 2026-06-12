import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  return (
    <main className="container mx-auto max-w-4xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-muted-foreground">
        Gráficos e resumos chegam na próxima fase.
      </p>
      <div className="flex gap-3">
        <Link href="/transactions" className={cn(buttonVariants())}>
          Ver transações
        </Link>
        <Link href="/upload" className={cn(buttonVariants({ variant: "outline" }))}>
          Importar fatura
        </Link>
      </div>
    </main>
  );
}
