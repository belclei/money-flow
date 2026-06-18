"use client";

import React, { useState } from "react";
import { getBankConfig, getBankLogoUrls } from "@/lib/banks";
import { ACCOUNT_TYPE_LABELS } from "@/lib/validators/account";
import type { Account, CreditCard } from "@/generated/prisma/client";

type AccountWithCommitted = Account & { committed: number };

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(v);
}

// ─── Bank logo ──────────────────────────────────────────────────────────────
// Cascata: DuckDuckGo → Google gstatic → badge de texto

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

// ─── Account card ───────────────────────────────────────────────────────────
// Regras de exibição (sem repetir dados):
//   • Sem limite e sem comprometido → só mostra saldo
//   • Com comprometido (sem limite) → saldo + "a sair" + disponível
//   • Com limite → saldo + barra (saldo / limite) + disponível p/ gastar
//   • Com limite e comprometido → barra + disponível real (saldo − comprometido)

function AccountCard({ account }: { account: AccountWithCommitted }) {
  const bank = getBankConfig(account.institution);
  const hasLimit = account.limit != null && account.limit > 0;
  const hasCommitted = account.committed > 0;

  // Disponível real = saldo - comprometido (pode ser negativo se comprometido > saldo)
  const available = account.currentBalance - account.committed;

  // Percentual usado do limite (baseado no saldo atual)
  const usedPct = hasLimit
    ? Math.min(100, Math.max(0, (account.currentBalance / account.limit!) * 100))
    : null;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 flex flex-col gap-3 shadow-md"
      style={{ background: `linear-gradient(135deg, ${bank.bg} 0%, ${bank.accent} 100%)`, color: bank.text }}
    >
      {/* Header with logo */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[10px] font-medium opacity-70 uppercase tracking-wider">
            {ACCOUNT_TYPE_LABELS[account.type as keyof typeof ACCOUNT_TYPE_LABELS] ?? account.type}
          </p>
          <p className="font-semibold text-sm mt-0.5">{account.name}</p>
        </div>
        <BankLogo domain={bank.domain} abbrev={bank.abbrev} accent={bank.accent} text={bank.text} />
      </div>

      {/* Balance — sempre exibido */}
      <div>
        <p className="text-[10px] opacity-60 uppercase tracking-wider mb-0.5">Saldo</p>
        <p className="text-2xl font-bold tabular-nums leading-none">
          {formatBRL(account.currentBalance)}
        </p>
      </div>

      {/* Barra de limite (quando tem limite) */}
      {hasLimit && (
        <div className="space-y-1.5">
          <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white/70"
              style={{ width: `${usedPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] opacity-70">
            <span>Limite: {formatBRL(account.limit!)}</span>
            <span>{Math.round(usedPct ?? 0)}% utilizado</span>
          </div>
        </div>
      )}

      {/* Rodapé: só mostra quando há comprometido */}
      {(hasCommitted || hasLimit) && (
        <div className="border-t border-white/20 pt-2.5 grid grid-cols-2 gap-2">
          {hasCommitted && (
            <div>
              <p className="text-[10px] opacity-60 uppercase tracking-wider">A sair</p>
              <p className="text-sm font-semibold tabular-nums opacity-90">
                {formatBRL(account.committed)}
              </p>
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
    </div>
  );
}

// ─── Credit card card ───────────────────────────────────────────────────────

function CreditCardCard({ card }: { card: CreditCard }) {
  const bank = getBankConfig(card.institution);
  const available = card.creditLimit != null ? card.creditLimit - card.currentBill : null;
  const usedPct = card.creditLimit
    ? Math.min(100, (card.currentBill / card.creditLimit) * 100)
    : null;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 flex flex-col gap-3 shadow-md"
      style={{ background: `linear-gradient(135deg, ${bank.bg} 0%, ${bank.accent} 100%)`, color: bank.text }}
    >
      {/* Header with logo */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[10px] font-medium opacity-70 uppercase tracking-wider">Cartão de crédito</p>
          <p className="font-semibold text-sm mt-0.5">{card.name}</p>
        </div>
        <BankLogo domain={bank.domain} abbrev={bank.abbrev} accent={bank.accent} text={bank.text} />
      </div>

      {/* Fatura */}
      <div>
        <p className="text-[10px] opacity-60 uppercase tracking-wider mb-0.5">Fatura atual</p>
        <p className="text-2xl font-bold tabular-nums leading-none">
          {formatBRL(card.currentBill)}
        </p>
      </div>

      {/* Barra de uso + breakdown */}
      {card.creditLimit != null && (
        <div className="space-y-1.5">
          <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white/70"
              style={{ width: `${usedPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] opacity-70">
            <span>Limite: {formatBRL(card.creditLimit)}</span>
            <span>{Math.round(usedPct ?? 0)}% utilizado</span>
          </div>
        </div>
      )}

      {card.creditLimit != null && (
        <div className="border-t border-white/20 pt-2.5">
          <p className="text-[10px] opacity-60 uppercase tracking-wider">Disponível</p>
          <p className="text-sm font-semibold tabular-nums opacity-90">
            {formatBRL(available ?? 0)}
          </p>
        </div>
      )}

      <p className="text-[10px] opacity-50 -mt-1">
        Vence dia {card.dueDay}{card.closingDay ? ` · Fecha dia ${card.closingDay}` : ""}
      </p>
    </div>
  );
}

// ─── Grid ───────────────────────────────────────────────────────────────────

export function WalletGrid({
  accounts,
  creditCards,
}: {
  accounts: AccountWithCommitted[];
  creditCards: CreditCard[];
}) {
  if (accounts.length === 0 && creditCards.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Carteira
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((a) => (
          <AccountCard key={a.id} account={a} />
        ))}
        {creditCards.map((c) => (
          <CreditCardCard key={c.id} card={c} />
        ))}
      </div>
    </section>
  );
}
