"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { AccountForm } from "./account-form";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/validators/account";
import type { Account, AccountAccess } from "@/generated/prisma/client";

type AccountWithAccesses = Account & {
  accesses: (AccountAccess & { grantee: { id: string; email: string } })[];
};

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

// ─── Share dialog ─────────────────────────────────────────────────────────────

function ShareDialog({
  account,
  onClose,
  onUpdate,
}: {
  account: AccountWithAccesses;
  onClose: () => void;
  onUpdate: (a: AccountWithAccesses) => void;
}) {
  const [users, setUsers] = useState<{ id: string; email: string }[]>([]);
  const [granteeId, setGranteeId] = useState("");
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [loading, setLoading] = useState(false);
  const [accesses, setAccesses] = useState(account.accesses);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []));
  }, []);

  async function handleGrant() {
    if (!granteeId) return;
    setLoading(true);
    const res = await fetch(`/api/accounts/${account.id}/access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ granteeId, permission }),
    });
    if (res.ok) {
      const newAccess = await res.json();
      const updated = [...accesses.filter((a) => a.granteeId !== granteeId), newAccess];
      setAccesses(updated);
      onUpdate({ ...account, accesses: updated });
      setGranteeId("");
    }
    setLoading(false);
  }

  async function handleRevoke(gId: string) {
    await fetch(`/api/accounts/${account.id}/access/${gId}`, { method: "DELETE" });
    const updated = accesses.filter((a) => a.granteeId !== gId);
    setAccesses(updated);
    onUpdate({ ...account, accesses: updated });
  }

  const alreadyGranted = new Set(accesses.map((a) => a.granteeId));
  const available = users.filter((u) => !alreadyGranted.has(u.id));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compartilhar — {account.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current grants */}
          {accesses.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Acessos concedidos</p>
              {accesses.map((a) => (
                <div key={a.granteeId} className="flex items-center justify-between text-sm">
                  <span>{a.grantee.email}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground border rounded px-1.5 py-0.5">
                      {a.permission === "edit" ? "editar" : "visualizar"}
                    </span>
                    <button
                      onClick={() => handleRevoke(a.granteeId)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Grant access form */}
          {available.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conceder acesso</p>
              <Select value={granteeId} onValueChange={(v) => setGranteeId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar usuário" />
                </SelectTrigger>
                <SelectContent>
                  {available.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={permission} onValueChange={(v) => setPermission((v ?? "view") as "view" | "edit")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">Visualizar</SelectItem>
                  <SelectItem value="edit">Editar</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleGrant} disabled={!granteeId || loading} size="sm">
                {loading ? "Concedendo…" : "Conceder acesso"}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {users.length === 0
                ? "Nenhum outro usuário cadastrado no sistema."
                : "Todos os usuários já têm acesso."}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Account card ─────────────────────────────────────────────────────────────

function AccountCard({
  account,
  isOwner,
  onEdit,
  onDelete,
  onShare,
}: {
  account: AccountWithAccesses;
  isOwner: boolean;
  onEdit: (a: AccountWithAccesses) => void;
  onDelete: (a: AccountWithAccesses) => void;
  onShare: (a: AccountWithAccesses) => void;
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
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[type]}`}>
              {ACCOUNT_TYPE_LABELS[type]}
            </span>
            {!isOwner && (
              <span className="text-xs text-muted-foreground border rounded px-1.5 py-0.5">compartilhada</span>
            )}
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
            <p className={`text-xl font-semibold tabular-nums ${account.currentBalance < 0 ? "text-red-600" : ""}`}>
              {formatBRL(account.currentBalance, account.currency)}
            </p>
          </div>
        )}

        {account.accesses.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {account.accesses.length} acesso{account.accesses.length !== 1 ? "s" : ""} concedido{account.accesses.length !== 1 ? "s" : ""}
          </p>
        )}

        {isOwner && (
          <div className="flex gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onShare(account)} className="text-xs text-muted-foreground hover:text-foreground px-1">
              ⇄ Compartilhar
            </button>
            <button onClick={() => onEdit(account)} className="text-xs text-muted-foreground hover:text-foreground px-1">
              ✎ Editar
            </button>
            <button onClick={() => onDelete(account)} className="text-xs text-muted-foreground hover:text-destructive px-1">
              ✕ Excluir
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main client ─────────────────────────────────────────────────────────────

export function AccountsClient({
  initialAccounts,
  currentUserId,
}: {
  initialAccounts: AccountWithAccesses[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<AccountWithAccesses | null>(null);
  const [deleting, setDeleting] = useState<AccountWithAccesses | null>(null);
  const [sharing, setSharing] = useState<AccountWithAccesses | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function handleSaved(saved: Account) {
    const withAccesses = { ...saved, accesses: [] } as AccountWithAccesses;
    if (editing) {
      setAccounts((prev) => prev.map((a) => (a.id === saved.id ? { ...a, ...saved } : a)));
      setEditing(null);
    } else {
      setAccounts((prev) => [...prev, withAccesses]);
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

  function handleShareUpdate(updated: AccountWithAccesses) {
    setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    if (sharing?.id === updated.id) setSharing(updated);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {accounts.length} conta{accounts.length !== 1 ? "s" : ""}
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
              isOwner={a.userId === currentUserId}
              onEdit={setEditing}
              onDelete={setDeleting}
              onShare={setSharing}
            />
          ))}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={adding} onOpenChange={(open) => !open && setAdding(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova conta</DialogTitle></DialogHeader>
          <AccountForm onSave={handleSaved} onCancel={() => setAdding(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar conta</DialogTitle></DialogHeader>
          {editing && (
            <AccountForm account={editing} onSave={handleSaved} onCancel={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir conta?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleting?.name}{deleting?.institution ? ` — ${deleting.institution}` : ""}
          </p>
          <p className="text-sm text-red-600">Esta ação não pode ser desfeita.</p>
          <div className="flex gap-2 pt-2">
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteLoading}>
              {deleteLoading ? "Excluindo…" : "Excluir"}
            </Button>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancelar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share dialog */}
      {sharing && (
        <ShareDialog
          account={sharing}
          onClose={() => setSharing(null)}
          onUpdate={handleShareUpdate}
        />
      )}
    </>
  );
}
