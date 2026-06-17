import { z } from "zod";

export const RECURRING_KINDS = ["income", "expense"] as const;
export type RecurringKind = (typeof RECURRING_KINDS)[number];

export const RecurringSchema = z.object({
  kind: z.enum(RECURRING_KINDS),
  description: z.string().min(1).max(200),
  amount: z.number().positive().finite(),
  dayOfMonth: z.number().int().min(1).max(31),
  accountId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const PatchRecurringSchema = RecurringSchema.partial();
