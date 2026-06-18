import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.email !== "belclei@gmail.com") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invites = await prisma.invite.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ invites });
}
