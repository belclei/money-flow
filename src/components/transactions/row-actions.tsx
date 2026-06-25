"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Transaction } from "./table";

function formatDateInput(date: Date | string) {
  return new Date(date).toISOString().slice(0, 10);
}

export function RowActions({ transaction }: { transaction: Transaction }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    description: transaction.description,
    amount: String(transaction.amount),
    category: transaction.category ?? "",
    cardHolder: transaction.cardHolder ?? "",
    date: formatDateInput(transaction.date),
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setLoading(true);
    await fetch(`/api/transactions/${transaction.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: form.description,
        amount: parseFloat(form.amount),
        category: form.category || null,
        cardHolder: form.cardHolder || null,
        date: form.date,
      }),
    });
    setLoading(false);
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/transactions/${transaction.id}`, { method: "DELETE" });
    setLoading(false);
    setDeleting(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-muted-foreground hover:text-foreground px-1"
          title="Editar"
        >
          ✎
        </button>
        <button
          onClick={() => setDeleting(true)}
          className="text-xs text-muted-foreground hover:text-destructive px-1"
          title="Excluir"
        >
          ✕
        </button>
      </div>

      {/* Edit dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar transação</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Data</label>
                <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Valor</label>
                <CurrencyInput value={form.amount} onChange={(v) => set("amount", v)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Descrição</label>
              <Input value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Categoria</label>
                <Input placeholder="—" value={form.category} onChange={(e) => set("category", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Portador</label>
                <Input placeholder="—" value={form.cardHolder} onChange={(e) => set("cardHolder", e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleSave} disabled={loading}>
                {loading ? "Salvando…" : "Salvar"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir transação?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{transaction.description}</p>
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? "Excluindo…" : "Excluir"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDeleting(false)}>Cancelar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
