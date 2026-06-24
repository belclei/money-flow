"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getBankConfig, getBankLogoUrls } from "@/lib/banks";
import { ACCOUNT_TYPE_LABELS } from "@/lib/validators/account";
import { AccountForm } from "@/components/accounts/account-form";
import { CreditCardForm } from "@/components/credit-cards/credit-card-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Account, CreditCard } from "@/generated/prisma/client";

type AccountWithCommitted = Account & { committed: number };

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(v);
}

// ─── Bank logo ───────────────────────────────────────────────────────────────

function BankLogo({
  domain,
  abbrev,
  accent,
  text,
}: {
  domain?: string;
  abbrev: string;
  accent: string;
  text: string;
}) {
  const urls = domain ? getBankLogoUrls(domain) : [];
  const [idx, setIdx] = useState(0);
  const currentUrl = urls[idx];

  if (currentUrl) {
    return (
      <img
        src={currentUrl}
        alt="Logo do banco"
        referrerPolicy="no-referrer"
        className="w-10 h-10 object-contain rounded bg-white p-0.5"
        onError={() => setIdx((i) => i + 1)}
      />
    );
  }

  return (
    <span
      className="inline-flex items-center justify-center rounded w-10 h-10 text-[11px] font-bold tracking-wide"
      style={{ background: accent, color: text }}
    >
      {abbrev}
    </span>
  );
}

// ─── Action buttons (overlay) ────────────────────────────────────────────────

function CardActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="absolute bottom-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}
        className="text-xs bg-black/20 hover:bg-black/40 backdrop-blur-sm rounded px-2 py-1 text-white transition-colors"
      >
        Editar
      </button>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
        className="text-xs bg-black/20 hover:bg-red-500/60 backdrop-blur-sm rounded px-2 py-1 text-white transition-colors"
      >
        Excluir
      </button>
    </div>
  );
}

// ─── Account card ────────────────────────────────────────────────────────────

function AccountCard({
  account,
  onEdit,
  onDelete,
}: {
  account: AccountWithCommitted;
  onEdit: (a: AccountWithCommitted) => void;
  onDelete: (a: AccountWithCommitted) => void;
}) {
  const bank = getBankConfig(account.institution);
  const hasLimit = account.limit != null && account.limit > 0;
  const hasCommitted = account.committed > 0;
  const available = account.currentBalance - account.committed;
  const usedPct = hasLimit
    ? Math.min(100, Math.max(0, (account.currentBalance / account.limit!) * 100))
    : null;

  return (
    <div className="relative group">
      <Link
        href={`/transactions?accountId=${account.id}`}
        className="relative overflow-hidden rounded-2xl p-5 flex flex-col gap-3 shadow-md block transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        style={{ background: `linear-gradient(135deg, ${bank.bg} 0%, ${bank.accent} 100%)`, color: bank.text }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-[10px] font-medium opacity-70 uppercase tracking-wider">
              {ACCOUNT_TYPE_LABELS[account.type as keyof typeof ACCOUNT_TYPE_LABELS] ?? account.type}
            </p>
            <p className="font-semibold text-sm mt-0.5">{account.name}</p>
          </div>
          <BankLogo domain={bank.domain} abbrev={bank.abbrev} accent={bank.accent} text={bank.text} />
        </div>

        <div>
          <p className="text-[10px] opacity-60 uppercase tracking-wider mb-0.5">Saldo</p>
          <p className="text-2xl font-bold tabular-nums leading-none">
            {formatBRL(account.currentBalance)}
          </p>
        </div>

        {hasLimit && (
          <div className="space-y-1.5">
            <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full rounded-full bg-white/70" style={{ width: `${usedPct}%` }} />
            </div>
            <div className="flex justify-between text-[10px] opacity-70">
              <span>Limite: {formatBRL(account.limit!)}</span>
              <span>{Math.round(usedPct ?? 0)}% utilizado</span>
            </div>
          </div>
        )}

        {(hasCommitted || hasLimit) && (
          <div className="border-t border-white/20 pt-2.5 grid grid-cols-2 gap-2 pb-6">
            {hasCommitted && (
              <div>
                <p className="text-[10px] opacity-60 uppercase tracking-wider">A sair</p>
                <p className="text-sm font-semibold tabular-nums opacity-90">{formatBRL(account.committed)}</p>
              </div>
            )}
            <div className={hasCommitted ? "" : "col-span-2"}>
              <p className="text-[10px] opacity-60 uppercase tracking-wider">Disponível</p>
              <p className={`text-sm font-semibold tabular-nums ${available < 0 ? "text-red-300" : "opacity-90"}`}>
                {formatBRL(available)}
              </p>
            </div>
          </div>
        )}

        {!(hasCommitted || hasLimit) && <div className="pb-4" />}
      </Link>
      <CardActions onEdit={() => onEdit(account)} onDelete={() => onDelete(account)} />
    </div>
  );
}

// ─── Credit card card ─────────────────────────────────────────────────────────

function CreditCardCard({
  card,
  onEdit,
  onDelete,
}: {
  card: CreditCard;
  onEdit: (c: CreditCard) => void;
  onDelete: (c: CreditCard) => void;
}) {
  const bank = getBankConfig(card.institution);
  const available = card.creditLimit != null ? card.creditLimit - card.currentBill : null;
  const usedPct = card.creditLimit
    ? Math.min(100, (card.currentBill / card.creditLimit) * 100)
    : null;

  return (
    <div className="relative group">
      <Link
        href={`/transactions?creditCardId=${card.id}`}
        className="relative overflow-hidden rounded-2xl p-5 flex flex-col gap-3 shadow-md block transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        style={{ background: `linear-gradient(135deg, ${bank.bg} 0%, ${bank.accent} 100%)`, color: bank.text }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-[10px] font-medium opacity-70 uppercase tracking-wider">Cartão de crédito</p>
            <p className="font-semibold text-sm mt-0.5">{card.name}</p>
          </div>
          <BankLogo domain={bank.domain} abbrev={bank.abbrev} accent={bank.accent} text={bank.text} />
        </div>

        <div>
          <p className="text-[10px] opacity-60 uppercase tracking-wider mb-0.5">Fatura atual</p>
          <p className="text-2xl font-bold tabular-nums leading-none">{formatBRL(card.currentBill)}</p>
        </div>

        {card.creditLimit != null && (
          <div className="space-y-1.5">
            <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full rounded-full bg-white/70" style={{ width: `${usedPct}%` }} />
            </div>
            <div className="flex justify-between text-[10px] opacity-70">
              <span>Limite: {formatBRL(card.creditLimit)}</span>
              <span>{Math.round(usedPct ?? 0)}% utilizado</span>
            </div>
          </div>
        )}

        {card.creditLimit != null ? (
          <div className="border-t border-white/20 pt-2.5 pb-6">
            <p className="text-[10px] opacity-60 uppercase tracking-wider">Disponível</p>
            <p className="text-sm font-semibold tabular-nums opacity-90">{formatBRL(available ?? 0)}</p>
          </div>
        ) : (
          <div className="pb-4" />
        )}

        <p className="text-[10px] opacity-50 -mt-1">
          Vence dia {card.dueDay}{card.closingDay ? ` · Fecha dia ${card.closingDay}` : ""}
        </p>
      </Link>
      <CardActions onEdit={() => onEdit(card)} onDelete={() => onDelete(card)} />
    </div>
  );
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

export function WalletGrid({
  accounts: initialAccounts,
  creditCards: initialCards,
}: {
  accounts: AccountWithCommitted[];
  creditCards: CreditCard[];
}) {
  const router = useRouter();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [cards, setCards] = useState(initialCards);

  const [editingAccount, setEditingAccount] = useState<AccountWithCommitted | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<AccountWithCommitted | null>(null);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [deletingCard, setDeletingCard] = useState<CreditCard | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function handleAccountSaved(saved: Account) {
    setAccounts((prev) =>
      prev.map((a) => (a.id === saved.id ? { ...saved, committed: a.committed } : a))
    );
    setEditingAccount(null);
    router.refresh();
  }

  async function handleAccountDelete() {
    if (!deletingAccount) return;
    setDeleteLoading(true);
    await fetch(`/api/accounts/${deletingAccount.id}`, { method: "DELETE" });
    setAccounts((prev) => prev.filter((a) => a.id !== deletingAccount.id));
    setDeleteLoading(false);
    setDeletingAccount(null);
    router.refresh();
  }

  function handleCardSaved(saved: CreditCard) {
    setCards((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
    setEditingCard(null);
    router.refresh();
  }

  async function handleCardDelete() {
    if (!deletingCard) return;
    setDeleteLoading(true);
    await fetch(`/api/credit-cards/${deletingCard.id}`, { method: "DELETE" });
    setCards((prev) => prev.filter((c) => c.id !== deletingCard.id));
    setDeleteLoading(false);
    setDeletingCard(null);
    router.refresh();
  }

  if (accounts.length === 0 && cards.length === 0) return null;

  return (
    <>
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Carteira
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((a) => (
            <AccountCard key={a.id} account={a} onEdit={setEditingAccount} onDelete={setDeletingAccount} />
          ))}
          {cards.map((c) => (
            <CreditCardCard key={c.id} card={c} onEdit={setEditingCard} onDelete={setDeletingCard} />
          ))}
        </div>
      </section>

      {/* Editar conta */}
      <Dialog open={!!editingAccount} onOpenChange={(open) => !open && setEditingAccount(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar conta</DialogTitle></DialogHeader>
          {editingAccount && (
            <AccountForm account={editingAccount} onSave={handleAccountSaved} onCancel={() => setEditingAccount(null)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Excluir conta */}
      <Dialog open={!!deletingAccount} onOpenChange={(open) => !open && setDeletingAccount(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir conta?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deletingAccount?.name}{deletingAccount?.institution ? ` — ${deletingAccount.institution}` : ""}
          </p>
          <p className="text-sm text-red-600">Esta ação não pode ser desfeita.</p>
          <div className="flex gap-2 pt-2">
            <Button variant="destructive" onClick={handleAccountDelete} disabled={deleteLoading}>
              {deleteLoading ? "Excluindo…" : "Excluir"}
            </Button>
            <Button variant="outline" onClick={() => setDeletingAccount(null)}>Cancelar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Editar cartão */}
      <Dialog open={!!editingCard} onOpenChange={(open) => !open && setEditingCard(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar cartão</DialogTitle></DialogHeader>
          {editingCard && (
            <CreditCardForm card={editingCard} accounts={accounts} onSave={handleCardSaved} onCancel={() => setEditingCard(null)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Excluir cartão */}
      <Dialog open={!!deletingCard} onOpenChange={(open) => !open && setDeletingCard(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir cartão?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{deletingCard?.name}</p>
          <p className="text-sm text-red-600">Esta ação não pode ser desfeita.</p>
          <div className="flex gap-2 pt-2">
            <Button variant="destructive" onClick={handleCardDelete} disabled={deleteLoading}>
              {deleteLoading ? "Excluindo…" : "Excluir"}
            </Button>
            <Button variant="outline" onClick={() => setDeletingCard(null)}>Cancelar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
