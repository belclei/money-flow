import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { RecurringSchema } from "@/lib/validators/recurring";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const recurrings = await prisma.recurringTransaction.findMany({
    where: { userId: session.user.id },
    include: { account: true, category: true },
    orderBy: [{ kind: "asc" }, { dayOfMonth: "asc" }],
  });

  return NextResponse.json({ recurrings });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = RecurringSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const { endDate, ...rest } = parsed.data;
  const recurring = await prisma.recurringTransaction.create({
    data: {
      ...rest,
      userId: session.user.id,
      ...(endDate && { endDate: new Date(endDate) }),
    },
    include: { account: true, category: true },
  });

  return NextResponse.json(recurring, { status: 201 });
}
