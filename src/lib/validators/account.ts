import { z } from "zod";

export const ACCOUNT_TYPES = ["checking", "savings", "investment", "cash"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: "Conta Corrente",
  savings: "Poupança",
  investment: "Investimento",
  cash: "Dinheiro",
};

export const AccountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(ACCOUNT_TYPES),
  institution: z.string().max(100).optional().nullable(),
  currentBalance: z.number().finite(),
  currency: z.string().default("BRL"),
});

export const PatchAccountSchema = AccountSchema.partial();
