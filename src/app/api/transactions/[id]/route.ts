import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

const PatchSchema = z.object({
  description: z.string().min(1).max(500).optional(),
  amount: z.number().finite().optional(),
  currency: z.string().optional(),
  amountBRL: z.number().finite().nullable().optional(),
  category: z.string().nullable().optional(),
  cardHolder: z.string().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const data = {
    ...parsed.data,
    ...(parsed.data.date && { date: new Date(parsed.data.date) }),
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { date: _d, ...rest } = data;
  const updateData = {
    ...rest,
    ...(parsed.data.date && { date: new Date(parsed.data.date) }),
  };

  const transaction = await prisma.transaction.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(transaction);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ status: "ok" });
}
