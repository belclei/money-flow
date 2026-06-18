import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { ManualTransactionSchema, TransactionQuerySchema } from "@/lib/validators/transaction";
import { transactionVisibilityWhere } from "@/lib/visibility";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = Object.fromEntries(new URL(req.url).searchParams);
  const query = TransactionQuerySchema.safeParse(params);
  if (!query.success) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const { page, limit, month, category, paymentMethod, currency, cardHolder, cardBrand, groupBy } =
    query.data;

  const visibilityWhere = await transactionVisibilityWhere(session.user.id);

  const where = {
    AND: [
      visibilityWhere,
      {
        ...(month && { invoiceMonth: month }),
        ...(category && { category }),
        ...(paymentMethod && { paymentMethod }),
        ...(currency && { currency }),
        ...(cardHolder && { cardHolder: { contains: cardHolder, mode: "insensitive" as const } }),
        ...(cardBrand && { cardBrand: { contains: cardBrand, mode: "insensitive" as const } }),
      },
    ],
  };

  const orderBy =
    groupBy === "bank"
      ? [{ cardBrand: "asc" as const }, { date: "desc" as const }]
      : groupBy === "holder"
      ? [{ cardHolder: "asc" as const }, { date: "desc" as const }]
      : [{ date: "desc" as const }];

  const [transactions, total] = await prisma.$transaction([
    prisma.transaction.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, include: { purchase: true } }),
    prisma.transaction.count({ where }),
  ]);

  return NextResponse.json({ transactions, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = ManualTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.issues }, { status: 400 });
  }

  const transaction = await prisma.transaction.create({
    data: { ...parsed.data, date: new Date(parsed.data.date), source: "manual", userId: session.user.id },
  });

  return NextResponse.json(transaction, { status: 201 });
}
