import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

interface Params {
  params: Promise<{ id: string; granteeId: string }>;
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, granteeId } = await params;
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account || account.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.accountAccess.deleteMany({ where: { accountId: id, granteeId } });
  return NextResponse.json({ status: "ok" });
}
