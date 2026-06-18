import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const alias = await prisma.portadorAlias.findUnique({ where: { id } });
  if (!alias || alias.ownerUserId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.portadorAlias.delete({ where: { id } });
  return NextResponse.json({ status: "ok" });
}
