import { z } from "zod";

export const CATEGORY_KINDS = ["income", "expense", "transfer"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const CATEGORY_KIND_LABELS: Record<CategoryKind, string> = {
  income: "Receita",
  expense: "Despesa",
  transfer: "Transferência",
};

export const CategorySchema = z.object({
  name: z.string().min(1).max(100),
  kind: z.enum(CATEGORY_KINDS),
  isFixed: z.boolean().default(false),
});

export const PatchCategorySchema = CategorySchema.partial();

export const DEFAULT_CATEGORIES: Array<{ name: string; kind: CategoryKind; isFixed: boolean }> = [
  { name: "Alimentação", kind: "expense", isFixed: false },
  { name: "Transporte", kind: "expense", isFixed: false },
  { name: "Moradia", kind: "expense", isFixed: true },
  { name: "Saúde", kind: "expense", isFixed: false },
  { name: "Educação", kind: "expense", isFixed: true },
  { name: "Lazer", kind: "expense", isFixed: false },
  { name: "Vestuário", kind: "expense", isFixed: false },
  { name: "Serviços", kind: "expense", isFixed: true },
  { name: "Outros", kind: "expense", isFixed: false },
  { name: "Salário", kind: "income", isFixed: true },
  { name: "Freelance", kind: "income", isFixed: false },
  { name: "Investimentos", kind: "income", isFixed: false },
  { name: "Outras receitas", kind: "income", isFixed: false },
  { name: "Transferência", kind: "transfer", isFixed: false },
];
