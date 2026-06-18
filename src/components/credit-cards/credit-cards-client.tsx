"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Account, CreditCard } from "@/generated/prisma/client";

type CardWithAccount = CreditCard & {
  debitAccount: { id: string; name: string } | null;
};

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

// ─── Form ──────────────────────────────────────────────────────────────────

function CreditCardForm({
  card,
  accounts,
  onSave,
  onCancel,
}: {
  card?: CardWithAccount;
  accounts: Account[];
  onSave: (c: CardWithAccount) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: card?.name ?? "",
    institution: card?.institution ?? "",
    creditLimit: card?.creditLimit != null ? String(card.creditLimit) : "",
    closingDay: card?.closingDay != null ? String(card.closingDay) : "",
    dueDay: card?.dueDay != null ? String(card.dueDay) : "",
    currentBill: card?.currentBill != null ? String(card.currentBill) : "0",
    currency: card?.currency ?? "BRL",
    autoDebit: card?.autoDebit ?? false,
    debitAccountId: card?.debitAccountId ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: string, value: string | boolean) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const url = card ? `/api/credit-cards/${card.id}` : "/api/credit-cards";
    const res = await fetch(url, {
      method: card ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        institution: form.institution || null,
        creditLimit: form.creditLimit ? parseFloat(form.creditLimit) : null,
        closingDay: form.closingDay ? parseInt(form.closingDay) : null,
        dueDay: parseInt(form.dueDay),
        currentBill: parseFloat(form.currentBill) || 0,
        currency: form.currency,
        autoDebit: form.autoDebit,
        debitAccountId: form.debitAccountId || null,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erro ao salvar.");
      return;
    }
    onSave(await res.json());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cc-name">Nome do cartão</Label>
        <Input id="cc-name" required placeholder="Ex: Nubank Roxinho" value={form.name} onChange={(e) => set("name", e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cc-inst">Instituição</Label>
        <Input id="cc-inst" placeholder="Ex: Nubank" value={form.institution} onChange={(e) => set("institution", e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="cc-limit">Limite (R$)</Label>
          <Input id="cc-limit" type="number" step="0.01" placeholder="Ex: 10000" value={form.creditLimit} onChange={(e) => set("creditLimit", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cc-bill">Fatura atual (R$)</Label>
          <Input id="cc-bill" type="number" step="0.01" value={form.currentBill} onChange={(e) => set("currentBill", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="cc-closing">Fechamento (dia)</Label>
          <Input id="cc-closing" type="number" min={1} max={31} placeholder="Ex: 1" value={form.closingDay} onChange={(e) => set("closingDay", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cc-due">Vencimento (dia) *</Label>
          <Input id="cc-due" type="number" min={1} max={31} required placeholder="Ex: 10" value={form.dueDay} onChange={(e) => set("dueDay", e.target.value)} />
        </div>
      </div>

      <div className="rounded-lg border p-3 space-y-3">
        <div className="flex items-center gap-2">
          <input
            id="cc-autodebit"
            type="checkbox"
            checked={form.autoDebit}
            onChange={(e) => set("autoDebit", e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="cc-autodebit" className="cursor-pointer">Débito automático</Label>
        </div>
        {form.autoDebit && (
          <div className="space-y-2">
            <Label>Débitar de qual conta</Label>
            <Select value={form.debitAccountId || "none"} onValueChange={(v) => set("debitAccountId", v === "none" ? "" : (v ?? ""))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar conta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Nenhuma —</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}{a.institution ? ` — ${a.institution}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando…" : card ? "Salvar alterações" : "Cadastrar cartão"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
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
            <p className="font-medium">{card.name}</p>
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

  function handleSaved(saved: CardWithAccount) {
    if (editing) {
      setCards((p) => p.map((c) => (c.id === saved.id ? saved : c)));
      setEditing(null);
    } else {
      setCards((p) => [...p, saved]);
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
