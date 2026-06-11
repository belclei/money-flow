import { z } from "zod";

export const ExtractedTransactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1).max(500),
  amount: z.number().finite(),
  category: z.string().optional(),
});

export const ManualTransactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1).max(500),
  amount: z.number().finite(),
  category: z.string().optional(),
  paymentMethod: z.enum(["credit_card", "debit", "pix", "cash", "other"]),
  cardBrand: z.string().optional(),
  invoiceMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

export const InviteCreateSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "viewer"]).default("viewer"),
});

export const InviteAcceptSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export const TransactionQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  category: z.string().optional(),
  paymentMethod: z.string().optional(),
});
