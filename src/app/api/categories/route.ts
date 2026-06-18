import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { CategorySchema } from "@/lib/validators/category";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.category.findMany({
    where: { OR: [{ userId: session.user.id }, { userId: null }] },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = CategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.issues }, { status: 400 });
  }

  const category = await prisma.category.create({
    data: { ...parsed.data, userId: session.user.id },
  });

  return NextResponse.json(category, { status: 201 });
}
