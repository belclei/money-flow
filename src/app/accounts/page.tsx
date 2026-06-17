import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { AccountsClient } from "@/components/accounts/accounts-client";

export default async function AccountsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return (
    <main className="container mx-auto max-w-5xl p-6 space-y-6">
      <AccountsClient initialAccounts={accounts} />
    </main>
  );
}
