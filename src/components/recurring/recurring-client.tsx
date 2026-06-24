"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { type RecurringKind } from "@/lib/validators/recurring";
import { CATEGORY_KIND_LABELS } from "@/lib/validators/category";
import type { Account, Category, RecurringTransaction } from "@/generated/prisma/client";

type RecurringWithRelations = RecurringTransaction & {
  account: Account | null;
  category: Category | null;
};

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function ordinal(day: number) {
  return `dia ${day}`;
}

// ─── Form ────────────────────────────────────────────────────────────────────

interface FormState {
  kind: RecurringKind;
  description: string;
  amount: string;
  dayOfMonth: string;
  accountId: string;
  categoryId: string;
  endDate: string;
  isActive: boolean;
}

function emptyForm(): FormState {
  return { kind: "expense", description: "", amount: "", dayOfMonth: "", accountId: "", categoryId: "", endDate: "", isActive: true };
}

function recurringToForm(r: RecurringWithRelations): FormState {
  return {
    kind: r.kind as RecurringKind,
    description: r.description,
    amount: String(r.amount),
    dayOfMonth: String(r.dayOfMonth),
    accountId: r.accountId ?? "",
    categoryId: r.categoryId ?? "",
    endDate: r.endDate ? new Date(r.endDate).toISOString().slice(0, 10) : "",
    isActive: r.isActive,
  };
}

function RecurringForm({
  recurring,
  accounts,
  categories,
  onSave,
  onCancel,
}: {
  recurring?: RecurringWithRelations;
  accounts: Account[];
  categories: Category[];
  onSave: (r: RecurringWithRelations) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(recurring ? recurringToForm(recurring) : emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const filteredCategories = categories.filter(
    (c) => c.kind === form.kind || c.kind === "transfer"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const url = recurring ? `/api/recurring/${recurring.id}` : "/api/recurring";
    const method = recurring ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: form.kind,
        description: form.description,
        amount: parseFloat(form.amount),
        dayOfMonth: parseInt(form.dayOfMonth),
        accountId: form.accountId || null,
        categoryId: form.categoryId || null,
        endDate: form.endDate || null,
        isActive: form.isActive,
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
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={form.kind} onValueChange={(v) => set("kind", (v ?? "expense") as RecurringKind)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Despesa</SelectItem>
              <SelectItem value="income">Receita</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rec-day">Dia do mês</Label>
          <Input
            id="rec-day"
            type="number"
            min={1}
            max={31}
            required
            placeholder="Ex: 5"
            value={form.dayOfMonth}
            onChange={(e) => set("dayOfMonth", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rec-desc">Descrição</Label>
        <Input
          id="rec-desc"
          required
          placeholder="Ex: Aluguel"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rec-amount">Valor (R$)</Label>
        <Input
          id="rec-amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          placeholder="0,00"
          value={form.amount}
          onChange={(e) => set("amount", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Conta</Label>
          <Select value={form.accountId || "none"} onValueChange={(v) => set("accountId", v === "none" ? "" : (v ?? ""))}>
            <SelectTrigger><SelectValue placeholder="— Nenhuma —" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Nenhuma —</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={form.categoryId || "none"} onValueChange={(v) => set("categoryId", v === "none" ? "" : (v ?? ""))}>
            <SelectTrigger><SelectValue placeholder="— Nenhuma —" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Nenhuma —</SelectItem>
              {filteredCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rec-end">Data de encerramento</Label>
        <Input
          id="rec-end"
          type="date"
          value={form.endDate}
          onChange={(e) => set("endDate", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Deixe em branco para recorrência infinita.</p>
      </div>

      {recurring && (
        <div className="flex items-center gap-2">
          <input
            id="rec-active"
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="rec-active" className="cursor-pointer">Ativo</Label>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando…" : recurring ? "Salvar alterações" : "Criar recorrência"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function RecurringRow({
  recurring,
  onEdit,
  onDelete,
  onToggle,
}: {
  recurring: RecurringWithRelations;
  onEdit: (r: RecurringWithRelations) => void;
  onDelete: (r: RecurringWithRelations) => void;
  onToggle: (r: RecurringWithRelations) => void;
}) {
  const isExpense = recurring.kind === "expense";

  return (
    <div className={`group flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors ${!recurring.isActive ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{recurring.description}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-muted-foreground">{ordinal(recurring.dayOfMonth)}</span>
            {recurring.account && (
              <span className="text-xs text-muted-foreground">· {recurring.account.name}</span>
            )}
            {recurring.category && (
              <span className="text-xs text-muted-foreground">· {recurring.category.name}</span>
            )}
            {recurring.endDate && (
              <span className="text-xs text-muted-foreground">
                · até {new Date(recurring.endDate).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
              </span>
            )}
            {!recurring.isActive && (
              <span className="text-xs border rounded px-1.5 py-0.5 text-muted-foreground">inativo</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className={`font-semibold text-sm tabular-nums ${isExpense ? "text-red-600" : "text-green-600"}`}>
          {isExpense ? "−" : "+"}{formatBRL(recurring.amount)}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onToggle(recurring)}
            className="text-xs text-muted-foreground hover:text-foreground px-1"
            title={recurring.isActive ? "Desativar" : "Ativar"}
          >
            {recurring.isActive ? "⏸" : "▶"}
          </button>
          <button
            onClick={() => onEdit(recurring)}
            className="text-xs text-muted-foreground hover:text-foreground px-1"
          >
            ✎
          </button>
          <button
            onClick={() => onDelete(recurring)}
            className="text-xs text-muted-foreground hover:text-destructive px-1"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main client ─────────────────────────────────────────────────────────────

export function RecurringClient({
  initialRecurrings,
  accounts,
  categories,
  accountFilter,
}: {
  initialRecurrings: RecurringWithRelations[];
  accounts: Account[];
  categories: Category[];
  accountFilter?: string | null;
}) {
  const router = useRouter();
  const [recurrings, setRecurrings] = useState(initialRecurrings);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<RecurringWithRelations | null>(null);
  const [deleting, setDeleting] = useState<RecurringWithRelations | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function handleSaved(saved: RecurringWithRelations) {
    if (editing) {
      setRecurrings((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
      setEditing(null);
    } else {
      setRecurrings((prev) => [...prev, saved]);
      setAdding(false);
    }
    router.refresh();
  }

  async function handleToggle(r: RecurringWithRelations) {
    const res = await fetch(`/api/recurring/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !r.isActive }),
    });
    if (res.ok) {
      const updated = await res.json();
      setRecurrings((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      router.refresh();
    }
  }

  async function handleDeleteConfirm() {
    if (!deleting) return;
    setDeleteLoading(true);
    await fetch(`/api/recurring/${deleting.id}`, { method: "DELETE" });
    setRecurrings((prev) => prev.filter((r) => r.id !== deleting.id));
    setDeleteLoading(false);
    setDeleting(null);
    router.refresh();
  }

  const expenses = recurrings.filter((r) => r.kind === "expense");
  const incomes = recurrings.filter((r) => r.kind === "income");
  const totalExpenses = expenses.filter((r) => r.isActive).reduce((s, r) => s + r.amount, 0);
  const totalIncome = incomes.filter((r) => r.isActive).reduce((s, r) => s + r.amount, 0);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          {accountFilter ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <Link href="/recurring" className="text-xs text-muted-foreground hover:text-foreground">
                  ← Todas as recorrências
                </Link>
              </div>
              <h1 className="text-2xl font-semibold">Recorrências — {accountFilter}</h1>
            </>
          ) : (
            <h1 className="text-2xl font-semibold">Recorrências</h1>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            Receitas e despesas fixas mensais
          </p>
        </div>
        <Button onClick={() => setAdding(true)}>+ Nova recorrência</Button>
      </div>

      {/* Summary */}
      {recurrings.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground mb-1">Receitas fixas / mês</p>
            <p className="text-xl font-semibold text-green-600 tabular-nums">{formatBRL(totalIncome)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground mb-1">Despesas fixas / mês</p>
            <p className="text-xl font-semibold text-red-600 tabular-nums">{formatBRL(totalExpenses)}</p>
          </div>
        </div>
      )}

      {/* Lists */}
      {recurrings.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">Nenhuma recorrência cadastrada ainda.</p>
          <Button variant="outline" className="mt-4" onClick={() => setAdding(true)}>
            Criar primeira recorrência
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {incomes.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Receitas</h2>
              <div className="rounded-lg border divide-y">
                {incomes.map((r) => (
                  <RecurringRow key={r.id} recurring={r} onEdit={setEditing} onDelete={setDeleting} onToggle={handleToggle} />
                ))}
              </div>
            </div>
          )}
          {expenses.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Despesas</h2>
              <div className="rounded-lg border divide-y">
                {expenses.map((r) => (
                  <RecurringRow key={r.id} recurring={r} onEdit={setEditing} onDelete={setDeleting} onToggle={handleToggle} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={adding} onOpenChange={(open) => !open && setAdding(false)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova recorrência</DialogTitle></DialogHeader>
          <RecurringForm accounts={accounts} categories={categories} onSave={handleSaved} onCancel={() => setAdding(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar recorrência</DialogTitle></DialogHeader>
          {editing && (
            <RecurringForm recurring={editing} accounts={accounts} categories={categories} onSave={handleSaved} onCancel={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir recorrência?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{deleting?.description}</p>
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
