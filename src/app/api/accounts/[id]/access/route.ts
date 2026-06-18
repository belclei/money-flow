import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

const GrantSchema = z.object({
  granteeId: z.string(),
  permission: z.enum(["view", "edit"]),
});

async function requireOwner(accountId: string, userId: string) {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account || account.userId !== userId) return null;
  return account;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!await requireOwner(id, session.user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const accesses = await prisma.accountAccess.findMany({
    where: { accountId: id },
    include: { grantee: { select: { id: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ accesses });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!await requireOwner(id, session.user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = GrantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  if (parsed.data.granteeId === session.user.id) {
    return NextResponse.json({ error: "Cannot grant access to yourself" }, { status: 400 });
  }

  const access = await prisma.accountAccess.upsert({
    where: { accountId_granteeId: { accountId: id, granteeId: parsed.data.granteeId } },
    update: { permission: parsed.data.permission },
    create: { accountId: id, granteeId: parsed.data.granteeId, permission: parsed.data.permission },
    include: { grantee: { select: { id: true, email: true } } },
  });

  return NextResponse.json(access, { status: 201 });
}
