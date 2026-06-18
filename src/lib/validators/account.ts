import { z } from "zod";

export const ACCOUNT_TYPES = ["checking", "savings", "credit_card", "investment", "cash"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: "Conta Corrente",
  savings: "Poupança",
  credit_card: "Cartão de Crédito",
  investment: "Investimento",
  cash: "Dinheiro",
};

export const AccountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(ACCOUNT_TYPES),
  institution: z.string().max(100).optional().nullable(),
  currentBalance: z.number().finite(),
  currency: z.string().default("BRL"),
  creditLimit: z.number().positive().optional().nullable(),
  closingDay: z.number().int().min(1).max(31).optional().nullable(),
  dueDay: z.number().int().min(1).max(31).optional().nullable(),
});

export const PatchAccountSchema = AccountSchema.partial();
