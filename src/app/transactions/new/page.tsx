"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  "Alimentação", "Transporte", "Moradia", "Saúde",
  "Educação", "Lazer", "Vestuário", "Serviços", "Outros",
  "Salário", "Freelance", "Rendimentos", "Outras receitas",
];

const PAYMENT_METHODS = [
  { value: "credit_card", label: "Cartão de crédito" },
  { value: "debit", label: "Débito" },
  { value: "pix", label: "Pix" },
  { value: "cash", label: "Dinheiro" },
  { value: "other", label: "Outro" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function NewTransactionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    date: todayISO(),
    description: "",
    amount: "",
    currency: "BRL",
    amountBRL: "",
    category: "",
    paymentMethod: "credit_card",
    cardBrand: "",
    cardHolder: "",
    invoiceMonth: currentMonth(),
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const body = {
      date: form.date,
      description: form.description,
      amount: parseFloat(form.amount),
      currency: form.currency,
      ...(form.amountBRL && form.currency !== "BRL" && {
        amountBRL: parseFloat(form.amountBRL),
      }),
      ...(form.category && { category: form.category }),
      paymentMethod: form.paymentMethod,
      ...(form.cardBrand && { cardBrand: form.cardBrand }),
      ...(form.cardHolder && { cardHolder: form.cardHolder }),
      ...(form.invoiceMonth && { invoiceMonth: form.invoiceMonth }),
    };

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (res.ok) {
      router.push("/transactions");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erro ao salvar.");
    }
  }

  return (
    <main className="container mx-auto max-w-xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Nova transação</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Registro manual sem PDF.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhes</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Data + mês de referência */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => set("date", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceMonth">Mês de referência</Label>
                <Input
                  id="invoiceMonth"
                  type="month"
                  value={form.invoiceMonth}
                  onChange={(e) => set("invoiceMonth", e.target.value)}
                />
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                required
                placeholder="Ex: Mercado Extra"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>

            {/* Valor + moeda */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="amount">Valor</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  required
                  placeholder="0,00"
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Moeda</Label>
                <Select value={form.currency} onValueChange={(v) => set("currency", v ?? "BRL")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Valor em BRL (só para moeda estrangeira) */}
            {form.currency !== "BRL" && (
              <div className="space-y-2">
                <Label htmlFor="amountBRL">Valor cobrado em BRL</Label>
                <Input
                  id="amountBRL"
                  type="number"
                  step="0.01"
                  placeholder="Equivalente em reais"
                  value={form.amountBRL}
                  onChange={(e) => set("amountBRL", e.target.value)}
                />
              </div>
            )}

            {/* Categoria + forma de pagamento */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={form.category || "none"}
                  onValueChange={(v) => set("category", v === "none" ? "" : (v ?? ""))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nenhuma —</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Forma de pagamento</Label>
                <Select
                  value={form.paymentMethod}
                  onValueChange={(v) => set("paymentMethod", v ?? "other")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Banco + portador */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cardBrand">Banco / Bandeira</Label>
                <Input
                  id="cardBrand"
                  placeholder="Ex: Nubank"
                  value={form.cardBrand}
                  onChange={(e) => set("cardBrand", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardHolder">Portador</Label>
                <Input
                  id="cardHolder"
                  placeholder="Ex: Titular"
                  value={form.cardHolder}
                  onChange={(e) => set("cardHolder", e.target.value)}
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando…" : "Salvar transação"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/transactions")}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
