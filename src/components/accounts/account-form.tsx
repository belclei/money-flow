"use client";

import { useState } from "react";
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
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/validators/account";
import type { Account } from "@/generated/prisma/client";

interface FormState {
  name: string;
  type: AccountType;
  institution: string;
  currentBalance: string;
  limit: string;
  currency: string;
}

function emptyForm(): FormState {
  return { name: "", type: "checking", institution: "", currentBalance: "0", limit: "", currency: "BRL" };
}

function accountToForm(a: Account): FormState {
  return {
    name: a.name,
    type: a.type as AccountType,
    institution: a.institution ?? "",
    currentBalance: String(a.currentBalance),
    limit: a.limit != null ? String(a.limit) : "",
    currency: a.currency,
  };
}

interface Props {
  account?: Account;
  onSave: (account: Account) => void;
  onCancel: () => void;
}

export function AccountForm({ account, onSave, onCancel }: Props) {
  const [form, setForm] = useState<FormState>(account ? accountToForm(account) : emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const url = account ? `/api/accounts/${account.id}` : "/api/accounts";
    const res = await fetch(url, {
      method: account ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        type: form.type,
        institution: form.institution || null,
        currentBalance: parseFloat(form.currentBalance) || 0,
        limit: form.limit ? parseFloat(form.limit) : null,
        currency: form.currency,
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
        <Label htmlFor="acc-name">Nome</Label>
        <Input id="acc-name" required placeholder="Ex: Nubank Conta" value={form.name} onChange={(e) => set("name", e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={form.type} onValueChange={(v) => set("type", v as AccountType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACCOUNT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Moeda</Label>
          <Select value={form.currency} onValueChange={(v) => set("currency", v ?? "BRL")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="BRL">BRL</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="acc-institution">Instituição</Label>
        <Input id="acc-institution" placeholder="Ex: Banco do Brasil" value={form.institution} onChange={(e) => set("institution", e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="acc-balance">Saldo atual</Label>
          <Input id="acc-balance" type="number" step="0.01" required placeholder="0,00" value={form.currentBalance} onChange={(e) => set("currentBalance", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="acc-limit">Limite (opcional)</Label>
          <Input id="acc-limit" type="number" step="0.01" placeholder="Ex: 2.000,00" value={form.limit} onChange={(e) => set("limit", e.target.value)} />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando…" : account ? "Salvar alterações" : "Criar conta"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}
