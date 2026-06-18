import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { PatchCategorySchema } from "@/lib/validators/category";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  // Categorias do sistema (userId null) não podem ser editadas por usuários
  if (existing.userId === null) {
    return NextResponse.json({ error: "Categorias do sistema não podem ser editadas" }, { status: 403 });
  }
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = PatchCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.issues }, { status: 400 });
  }

  const category = await prisma.category.update({ where: { id }, data: parsed.data });
  return NextResponse.json(category);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (existing.userId === null) {
    return NextResponse.json({ error: "Categorias do sistema não podem ser excluídas" }, { status: 403 });
  }
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ status: "ok" });
}
