"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AccountForm } from "./account-form";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/validators/account";
import type { Account } from "@/generated/prisma/client";

function formatBRL(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

const TYPE_COLORS: Record<AccountType, string> = {
  checking: "bg-blue-100 text-blue-800",
  savings: "bg-green-100 text-green-800",
  credit_card: "bg-purple-100 text-purple-800",
  investment: "bg-amber-100 text-amber-800",
  cash: "bg-gray-100 text-gray-800",
};

function AccountCard({
  account,
  onEdit,
  onDelete,
}: {
  account: Account;
  onEdit: (a: Account) => void;
  onDelete: (a: Account) => void;
}) {
  const type = account.type as AccountType;
  const isCreditCard = type === "credit_card";
  const available =
    isCreditCard && account.creditLimit != null
      ? account.creditLimit - account.currentBalance
      : null;
  const usedPct =
    isCreditCard && account.creditLimit
      ? Math.min(100, (account.currentBalance / account.creditLimit) * 100)
      : null;

  return (
    <Card className="group relative">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium truncate">{account.name}</p>
            {account.institution && (
              <p className="text-xs text-muted-foreground truncate">{account.institution}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[type]}`}
            >
              {ACCOUNT_TYPE_LABELS[type]}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {isCreditCard ? (
          <>
            <div>
              <p className="text-xs text-muted-foreground">Fatura atual</p>
              <p className="text-xl font-semibold tabular-nums text-red-600">
                {formatBRL(account.currentBalance, account.currency)}
              </p>
            </div>
            {account.creditLimit != null && (
              <>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-all"
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Disponível: {formatBRL(available ?? 0, account.currency)}</span>
                  <span>Limite: {formatBRL(account.creditLimit, account.currency)}</span>
                </div>
              </>
            )}
            {(account.closingDay || account.dueDay) && (
              <p className="text-xs text-muted-foreground">
                {account.closingDay && `Fecha dia ${account.closingDay}`}
                {account.closingDay && account.dueDay && " · "}
                {account.dueDay && `Vence dia ${account.dueDay}`}
              </p>
            )}
          </>
        ) : (
          <div>
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p
              className={`text-xl font-semibold tabular-nums ${
                account.currentBalance < 0 ? "text-red-600" : ""
              }`}
            >
              {formatBRL(account.currentBalance, account.currency)}
            </p>
          </div>
        )}

        <div className="flex gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(account)}
            className="text-xs text-muted-foreground hover:text-foreground px-1"
          >
            ✎ Editar
          </button>
          <button
            onClick={() => onDelete(account)}
            className="text-xs text-muted-foreground hover:text-destructive px-1"
          >
            ✕ Excluir
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export function AccountsClient({ initialAccounts }: { initialAccounts: Account[] }) {
  const router = useRouter();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function handleSaved(saved: Account) {
    if (editing) {
      setAccounts((prev) => prev.map((a) => (a.id === saved.id ? saved : a)));
      setEditing(null);
    } else {
      setAccounts((prev) => [...prev, saved]);
      setAdding(false);
    }
    router.refresh();
  }

  async function handleDeleteConfirm() {
    if (!deleting) return;
    setDeleteLoading(true);
    await fetch(`/api/accounts/${deleting.id}`, { method: "DELETE" });
    setAccounts((prev) => prev.filter((a) => a.id !== deleting.id));
    setDeleteLoading(false);
    setDeleting(null);
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {accounts.length} conta{accounts.length !== 1 ? "s" : ""} cadastrada{accounts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setAdding(true)}>+ Nova conta</Button>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">Nenhuma conta cadastrada ainda.</p>
          <Button variant="outline" className="mt-4" onClick={() => setAdding(true)}>
            Criar primeira conta
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((a) => (
            <AccountCard
              key={a.id}
              account={a}
              onEdit={setEditing}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={adding} onOpenChange={(open) => !open && setAdding(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova conta</DialogTitle>
          </DialogHeader>
          <AccountForm onSave={handleSaved} onCancel={() => setAdding(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar conta</DialogTitle>
          </DialogHeader>
          {editing && (
            <AccountForm
              account={editing}
              onSave={handleSaved}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir conta?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleting?.name}
            {deleting?.institution ? ` — ${deleting.institution}` : ""}
          </p>
          <p className="text-sm text-red-600">Esta ação não pode ser desfeita.</p>
          <div className="flex gap-2 pt-2">
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Excluindo…" : "Excluir"}
            </Button>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
