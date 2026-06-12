"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ReviewTransaction = {
  date: string;
  description: string;
  amount: number;
  currency: string;
  amountBRL?: number;
  category?: string;
  cardHolder?: string;
  installmentNumber?: number;
  installmentTotal?: number;
  installmentDescription?: string;
};

export function ReviewTable({
  initial,
  onConfirm,
  onCancel,
  loading,
}: {
  initial: ReviewTransaction[];
  onConfirm: (transactions: ReviewTransaction[]) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [rows, setRows] = useState<ReviewTransaction[]>(initial);

  function update(index: number, field: keyof ReviewTransaction, value: string | number) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }

  function remove(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  const totalBRL = rows
    .filter((t) => t.amount > 0 && t.currency === "BRL")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {rows.length} transaç{rows.length !== 1 ? "ões" : "ão"}
          {totalBRL > 0 && (
            <>
              {" · "}
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(totalBRL)}
            </>
          )}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button size="sm" onClick={() => onConfirm(rows)} disabled={loading || rows.length === 0}>
            {loading ? "Salvando…" : `Confirmar ${rows.length} transaç${rows.length !== 1 ? "ões" : "ão"}`}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border overflow-auto max-h-[60vh]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-32">Categoria</TableHead>
              <TableHead className="w-32">Portador</TableHead>
              <TableHead className="w-28 text-right">Valor</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((t, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Input
                    type="date"
                    value={t.date}
                    onChange={(e) => update(i, "date", e.target.value)}
                    className="h-7 text-xs"
                  />
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Input
                      value={t.description}
                      onChange={(e) => update(i, "description", e.target.value)}
                      className="h-7 text-xs"
                    />
                    {t.installmentNumber != null && (
                      <p className="text-xs text-muted-foreground">
                        Parcela {t.installmentNumber}/{t.installmentTotal}
                        {t.installmentDescription && ` · ${t.installmentDescription}`}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    value={t.category ?? ""}
                    placeholder="—"
                    onChange={(e) => update(i, "category", e.target.value)}
                    className="h-7 text-xs"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={t.cardHolder ?? ""}
                    placeholder="—"
                    onChange={(e) => update(i, "cardHolder", e.target.value)}
                    className="h-7 text-xs"
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        step="0.01"
                        value={t.amount}
                        onChange={(e) => update(i, "amount", parseFloat(e.target.value) || 0)}
                        className="h-7 text-xs w-24 text-right"
                      />
                      <span className="text-xs text-muted-foreground w-8">{t.currency}</span>
                    </div>
                    {t.amountBRL != null && t.currency !== "BRL" && (
                      <span className="text-xs text-muted-foreground">
                        R$ {t.amountBRL.toFixed(2)}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => remove(i)}
                    className="text-muted-foreground hover:text-destructive transition-colors text-xs"
                    title="Remover"
                  >
                    ✕
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
