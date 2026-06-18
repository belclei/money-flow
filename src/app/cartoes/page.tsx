import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { CreditCardsClient } from "@/components/credit-cards/credit-cards-client";

export default async function CartoesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const [cards, accounts] = await Promise.all([
    prisma.creditCard.findMany({
      where: { userId: session.user.id },
      include: { debitAccount: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.account.findMany({
      where: { userId: session.user.id, type: { in: ["checking", "savings"] } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className="container mx-auto max-w-5xl p-6 space-y-6">
      <CreditCardsClient initialCards={cards} accounts={accounts} />
    </main>
  );
}
