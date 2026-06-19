"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CreditCardForm } from "./credit-card-form";
import type { Account, CreditCard } from "@/generated/prisma/client";

type CardWithAccount = CreditCard & {
  debitAccount: { id: string; name: string } | null;
};

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

// ─── Card display ──────────────────────────────────────────────────────────

function CreditCardItem({
  card,
  onEdit,
  onDelete,
}: {
  card: CardWithAccount;
  onEdit: (c: CardWithAccount) => void;
  onDelete: (c: CardWithAccount) => void;
}) {
  const available = card.creditLimit != null ? card.creditLimit - card.currentBill : null;
  const usedPct = card.creditLimit ? Math.min(100, (card.currentBill / card.creditLimit) * 100) : null;

  return (
    <Card className="group">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link href={`/cartoes/${card.id}`} className="font-medium hover:text-emerald-600 transition-colors">
              {card.name}
            </Link>
            {card.institution && <p className="text-xs text-muted-foreground">{card.institution}</p>}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {card.autoDebit && (
              <span className="text-xs border rounded-full px-2 py-0.5 text-emerald-600 border-emerald-300">débito automático</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <p className="text-xs text-muted-foreground">Fatura atual</p>
          <p className="text-xl font-semibold tabular-nums text-red-600">{formatBRL(card.currentBill)}</p>
        </div>

        {card.creditLimit != null && (
          <>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${usedPct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Disponível: {formatBRL(available ?? 0)}</span>
              <span>Limite: {formatBRL(card.creditLimit)}</span>
            </div>
          </>
        )}

        <div className="text-xs text-muted-foreground space-y-0.5">
          {card.closingDay && <p>Fecha dia {card.closingDay}</p>}
          <p>Vence dia {card.dueDay}</p>
          {card.debitAccount && <p>Débita de: {card.debitAccount.name}</p>}
        </div>

        <div className="flex gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(card)} className="text-xs text-muted-foreground hover:text-foreground px-1">✎ Editar</button>
          <button onClick={() => onDelete(card)} className="text-xs text-muted-foreground hover:text-destructive px-1">✕ Excluir</button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────

export function CreditCardsClient({
  initialCards,
  accounts,
}: {
  initialCards: CardWithAccount[];
  accounts: Account[];
}) {
  const router = useRouter();
  const [cards, setCards] = useState(initialCards);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<CardWithAccount | null>(null);
  const [deleting, setDeleting] = useState<CardWithAccount | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function handleSaved(saved: CreditCard) {
    const debitAccount = accounts.find((a) => a.id === saved.debitAccountId);
    const full: CardWithAccount = {
      ...saved,
      debitAccount: debitAccount ? { id: debitAccount.id, name: debitAccount.name } : null,
    };
    if (editing) {
      setCards((p) => p.map((c) => (c.id === saved.id ? full : c)));
      setEditing(null);
    } else {
      setCards((p) => [...p, full]);
      setAdding(false);
    }
    router.refresh();
  }

  async function handleDeleteConfirm() {
    if (!deleting) return;
    setDeleteLoading(true);
    await fetch(`/api/credit-cards/${deleting.id}`, { method: "DELETE" });
    setCards((p) => p.filter((c) => c.id !== deleting.id));
    setDeleteLoading(false);
    setDeleting(null);
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cartões de crédito</h1>
          <p className="text-sm text-muted-foreground mt-1">{cards.length} cartão{cards.length !== 1 ? "ões" : ""} cadastrado{cards.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setAdding(true)}>+ Novo cartão</Button>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">Nenhum cartão cadastrado ainda.</p>
          <Button variant="outline" className="mt-4" onClick={() => setAdding(true)}>Cadastrar primeiro cartão</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => (
            <CreditCardItem key={c.id} card={c} onEdit={setEditing} onDelete={setDeleting} />
          ))}
        </div>
      )}

      <Dialog open={adding} onOpenChange={(open) => !open && setAdding(false)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo cartão de crédito</DialogTitle></DialogHeader>
          <CreditCardForm accounts={accounts} onSave={handleSaved} onCancel={() => setAdding(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar cartão</DialogTitle></DialogHeader>
          {editing && <CreditCardForm card={editing} accounts={accounts} onSave={handleSaved} onCancel={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir cartão?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{deleting?.name}</p>
          <div className="flex gap-2 pt-2">
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteLoading}>
              {deleteLoading ? "Excluindo…" : "Excluir"}
            </Button>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancelar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
