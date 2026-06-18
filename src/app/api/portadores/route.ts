import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

const CreateSchema = z.object({
  name: z.string().min(1).max(200),
  granteeUserId: z.string(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [asOwner, asGrantee] = await Promise.all([
    prisma.portadorAlias.findMany({
      where: { ownerUserId: session.user.id },
      include: { grantee: { select: { id: true, email: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.portadorAlias.findMany({
      where: { granteeUserId: session.user.id },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ asOwner, asGrantee });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const alias = await prisma.portadorAlias.create({
    data: {
      ownerUserId: session.user.id,
      granteeUserId: parsed.data.granteeUserId,
      name: parsed.data.name,
    },
    include: { grantee: { select: { id: true, email: true } } },
  });

  return NextResponse.json(alias, { status: 201 });
}
