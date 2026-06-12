import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { ExtractedTransactionSchema } from "@/lib/validators/transaction";
import type { ExtractedTransaction } from "@/lib/llm/types";

const ConfirmSchema = z.object({
  transactions: z.array(ExtractedTransactionSchema),
  meta: z.object({
    filename: z.string(),
    cardBrand: z.string().optional(),
    cardHolder: z.string().optional(),
    month: z.string(),
  }),
});

function buildPurchaseKey(t: ExtractedTransaction): string {
  const base = (t.installmentDescription ?? t.description)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return `${base}_${t.installmentTotal}`;
}

async function resolvePurchaseId(
  t: ExtractedTransaction,
  cardHolder?: string
): Promise<string> {
  const key = buildPurchaseKey(t);
  const existing = await prisma.purchase.findUnique({ where: { purchaseKey: key } });
  if (existing) return existing.id;

  const created = await prisma.purchase.create({
    data: {
      purchaseKey: key,
      description: t.installmentDescription ?? t.description,
      installmentCount: t.installmentTotal!,
      totalAmount: t.amount * t.installmentTotal!,
      currency: t.currency ?? "BRL",
      cardHolder: t.cardHolder ?? cardHolder ?? null,
    },
  });
  return created.id;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = ConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { transactions, meta } = parsed.data;

  const withPurchaseIds = await Promise.all(
    transactions.map(async (t) => {
      if (t.installmentTotal != null && t.installmentNumber != null) {
        const purchaseId = await resolvePurchaseId(t, meta.cardHolder);
        return { ...t, purchaseId };
      }
      return { ...t, purchaseId: undefined };
    })
  );

  const invoice = await prisma.invoice.create({
    data: {
      filename: meta.filename,
      cardBrand: meta.cardBrand,
      cardHolder: meta.cardHolder,
      month: meta.month,
      status: "processed",
      transactions: {
        create: withPurchaseIds.map((t) => ({
          date: new Date(t.date),
          description: t.description,
          amount: t.amount,
          currency: t.currency ?? "BRL",
          amountBRL: t.amountBRL,
          category: t.category,
          paymentMethod: "credit_card",
          cardBrand: meta.cardBrand,
          cardHolder: t.cardHolder ?? meta.cardHolder,
          source: "pdf_import",
          invoiceMonth: meta.month,
          installmentNumber: t.installmentNumber,
          purchaseId: t.purchaseId,
        })),
      },
    },
    include: { transactions: true },
  });

  return NextResponse.json({ status: "ok", invoice }, { status: 201 });
}
