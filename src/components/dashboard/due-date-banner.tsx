"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { CreditCard, Account } from "@/generated/prisma/client";

type CardWithAccount = CreditCard & {
  debitAccount: Pick<Account, "id" | "name"> | null;
};

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function BannerItem({ card, onDismiss }: { card: CardWithAccount; onDismiss: () => void }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function handlePay() {
    setLoading(true);
    await fetch(`/api/credit-cards/${card.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: card.currentBill }),
    });
    setLoading(false);
    setDone(true);
    router.refresh();
  }

  if (done) return null;

  return (
    <div className="flex items-center justify-between gap-4 py-3 px-4 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="min-w-0">
        <p className="text-sm font-medium text-amber-900">
          Fatura do <span className="font-semibold">{card.name}</span> vence hoje —{" "}
          <span className="tabular-nums">{formatBRL(card.currentBill)}</span>
        </p>
        {card.debitAccount && (
          <p className="text-xs text-amber-700 mt-0.5">
            {card.autoDebit ? "Débito automático configurado" : "Conta vinculada"}: {card.debitAccount.name}
          </p>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        <Button size="sm" onClick={handlePay} disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white">
          {loading ? "Pagando…" : "Pagar agora"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss} className="text-amber-700">
          Lembrar depois
        </Button>
      </div>
    </div>
  );
}

export function DueDateBanner({ cards }: { cards: CardWithAccount[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = cards.filter((c) => !dismissed.has(c.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map((c) => (
        <BannerItem
          key={c.id}
          card={c}
          onDismiss={() => setDismissed((prev) => new Set([...prev, c.id]))}
        />
      ))}
    </div>
  );
}
