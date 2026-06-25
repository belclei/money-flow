"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Account, CreditCard } from "@/generated/prisma/client";

interface Props {
  card?: CreditCard;
  accounts: Account[];
  onSave: (c: CreditCard) => void;
  onCancel: () => void;
}

export function CreditCardForm({ card, accounts, onSave, onCancel }: Props) {
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
          <CurrencyInput id="cc-limit" placeholder="Ex: 10.000,00" value={form.creditLimit} onChange={(v) => set("creditLimit", v)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cc-bill">Fatura atual (R$)</Label>
          <CurrencyInput id="cc-bill" value={form.currentBill} onChange={(v) => set("currentBill", v)} />
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
