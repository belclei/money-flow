import { z } from "zod";

export const CATEGORY_KINDS = ["income", "expense"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const CATEGORY_KIND_LABELS: Record<CategoryKind, string> = {
  income: "Receita",
  expense: "Despesa",
};

export const CategorySchema = z.object({
  name: z.string().min(1).max(100),
  kind: z.enum(CATEGORY_KINDS),
});

export const PatchCategorySchema = CategorySchema.partial();

export const DEFAULT_CATEGORIES: Array<{ name: string; kind: CategoryKind }> = [
  { name: "Alimentação", kind: "expense" },
  { name: "Transporte", kind: "expense" },
  { name: "Moradia", kind: "expense" },
  { name: "Saúde", kind: "expense" },
  { name: "Educação", kind: "expense" },
  { name: "Lazer", kind: "expense" },
  { name: "Vestuário", kind: "expense" },
  { name: "Serviços", kind: "expense" },
  { name: "Outros", kind: "expense" },
  { name: "Salário", kind: "income" },
  { name: "Freelance", kind: "income" },
  { name: "Rendimentos", kind: "income" },
  { name: "Outras receitas", kind: "income" },
];
