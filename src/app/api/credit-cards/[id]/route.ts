import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { PatchCreditCardSchema } from "@/lib/validators/credit-card";

interface Params { params: Promise<{ id: string }> }

async function requireOwner(id: string, userId: string) {
  const card = await prisma.creditCard.findUnique({ where: { id } });
  if (!card || card.userId !== userId) return null;
  return card;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  if (!await requireOwner(id, session.user.id)) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  const parsed = PatchCreditCardSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.issues }, { status: 400 });
  }

  const card = await prisma.creditCard.update({
    where: { id },
    data: parsed.data,
    include: { debitAccount: { select: { id: true, name: true } } },
  });
  return NextResponse.json(card);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  if (!await requireOwner(id, session.user.id)) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  await prisma.creditCard.delete({ where: { id } });
  return NextResponse.json({ status: "ok" });
}
