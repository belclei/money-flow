import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { AccountSchema } from "@/lib/validators/account";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = AccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.issues }, { status: 400 });
  }

  const account = await prisma.account.create({
    data: { ...parsed.data, userId: session.user.id },
  });

  return NextResponse.json(account, { status: 201 });
}
