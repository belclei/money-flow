import { getBankConfig } from "@/lib/banks";
import { ACCOUNT_TYPE_LABELS } from "@/lib/validators/account";
import type { Account, CreditCard } from "@/generated/prisma/client";

type AccountWithCommitted = Account & { committed: number };

function formatBRL(v: number, compact = false) {
  if (compact && Math.abs(v) >= 1000) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(v);
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(v);
}

// ─── Bank logo badge ────────────────────────────────────────────────────────

function BankBadge({ abbrev, accent, text }: { abbrev: string; accent: string; text: string }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide leading-none"
      style={{ background: accent, color: text, minWidth: "2rem" }}
    >
      {abbrev}
    </span>
  );
}

// ─── Account card ───────────────────────────────────────────────────────────

function AccountCard({ account }: { account: AccountWithCommitted }) {
  const bank = getBankConfig(account.institution);
  const available = account.currentBalance - account.committed;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 flex flex-col gap-3 shadow-md"
      style={{ background: `linear-gradient(135deg, ${bank.bg} 0%, ${bank.accent} 100%)`, color: bank.text }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-70 uppercase tracking-wider">
            {ACCOUNT_TYPE_LABELS[account.type as keyof typeof ACCOUNT_TYPE_LABELS] ?? account.type}
          </p>
          <p className="font-semibold text-sm mt-0.5">{account.name}</p>
        </div>
        <BankBadge abbrev={bank.abbrev} accent={bank.accent} text={bank.text} />
      </div>

      {/* Balance */}
      <div>
        <p className="text-[10px] opacity-60 uppercase tracking-wider mb-0.5">Saldo</p>
        <p className="text-2xl font-bold tabular-nums leading-none">
          {formatBRL(account.currentBalance)}
        </p>
      </div>

      {/* Committed / Available */}
      <div className="border-t border-white/20 pt-3 grid grid-cols-2 gap-2">
        <div>
          <p className="text-[10px] opacity-60 uppercase tracking-wider">Comprometido</p>
          <p className="text-sm font-semibold tabular-nums opacity-90">
            {formatBRL(account.committed)}
          </p>
        </div>
        <div>
          <p className="text-[10px] opacity-60 uppercase tracking-wider">Livre</p>
          <p className={`text-sm font-semibold tabular-nums ${available < 0 ? "text-red-300" : "opacity-90"}`}>
            {formatBRL(available)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Credit card card ───────────────────────────────────────────────────────

function CreditCardCard({ card }: { card: CreditCard }) {
  const bank = getBankConfig(card.institution);
  const available = card.creditLimit != null ? card.creditLimit - card.currentBill : null;
  const usedPct = card.creditLimit ? Math.min(100, (card.currentBill / card.creditLimit) * 100) : null;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 flex flex-col gap-3 shadow-md"
      style={{ background: `linear-gradient(135deg, ${bank.bg} 0%, ${bank.accent} 100%)`, color: bank.text }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-70 uppercase tracking-wider">Cartão de crédito</p>
          <p className="font-semibold text-sm mt-0.5">{card.name}</p>
        </div>
        <BankBadge abbrev={bank.abbrev} accent={bank.accent} text={bank.text} />
      </div>

      {/* Bill */}
      <div>
        <p className="text-[10px] opacity-60 uppercase tracking-wider mb-0.5">Fatura atual</p>
        <p className="text-2xl font-bold tabular-nums leading-none">
          {formatBRL(card.currentBill)}
        </p>
      </div>

      {/* Limit bar + breakdown */}
      <div className="border-t border-white/20 pt-3 space-y-2">
        {card.creditLimit != null && usedPct != null && (
          <>
            <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-white/70 transition-all"
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] opacity-60 uppercase tracking-wider">Limite total</p>
                <p className="text-sm font-semibold tabular-nums opacity-90">
                  {formatBRL(card.creditLimit)}
                </p>
              </div>
              <div>
                <p className="text-[10px] opacity-60 uppercase tracking-wider">Disponível</p>
                <p className="text-sm font-semibold tabular-nums opacity-90">
                  {formatBRL(available ?? 0)}
                </p>
              </div>
            </div>
          </>
        )}
        <p className="text-[10px] opacity-50">
          Vence dia {card.dueDay}{card.closingDay ? ` · Fecha dia ${card.closingDay}` : ""}
        </p>
      </div>
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
