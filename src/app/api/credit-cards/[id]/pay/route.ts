import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { PayBillSchema } from "@/lib/validators/credit-card";

interface Params { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const card = await prisma.creditCard.findUnique({
    where: { id },
    include: { debitAccount: true },
  });
  if (!card || card.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = PayBillSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { amount } = parsed.data;

  await prisma.$transaction(async (tx) => {
    // Zera a fatura do cartão (ou reduz pelo valor pago)
    await tx.creditCard.update({
      where: { id },
      data: { currentBill: Math.max(0, card.currentBill - amount) },
    });

    // Se há conta de débito vinculada, cria transação de saída
    if (card.debitAccountId && card.debitAccount) {
      await tx.account.update({
        where: { id: card.debitAccountId },
        data: { currentBalance: { decrement: amount } },
      });

      await tx.transaction.create({
        data: {
          userId: session.user.id,
          date: new Date(),
          description: `Pagamento fatura ${card.name}`,
          amount,
          currency: card.currency,
          category: "Pagamento de fatura",
          paymentMethod: "debit",
          source: "manual",
          invoiceMonth: (() => {
            const d = new Date();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          })(),
        },
      });
    }
  });

  return NextResponse.json({ status: "ok" });
}
