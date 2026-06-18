import { z } from "zod";

export const CreditCardSchema = z.object({
  name: z.string().min(1).max(100),
  institution: z.string().max(100).optional().nullable(),
  creditLimit: z.number().positive().optional().nullable(),
  closingDay: z.number().int().min(1).max(31).optional().nullable(),
  dueDay: z.number().int().min(1).max(31),
  currentBill: z.number().finite().default(0),
  currency: z.string().default("BRL"),
  autoDebit: z.boolean().default(false),
  debitAccountId: z.string().optional().nullable(),
});

export const PatchCreditCardSchema = CreditCardSchema.partial();

export const PayBillSchema = z.object({
  amount: z.number().positive().finite(),
});
