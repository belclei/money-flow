import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { AccountsClient } from "@/components/accounts/accounts-client";
import { accountVisibilityWhere } from "@/lib/visibility";

export default async function AccountsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  const accWhere = await accountVisibilityWhere(session.user.id);
  const accounts = await prisma.account.findMany({
    where: accWhere,
    include: { accesses: { include: { grantee: { select: { id: true, email: true } } } } },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return (
    <main className="container mx-auto max-w-5xl p-6 space-y-6">
      <AccountsClient initialAccounts={accounts} currentUserId={session.user.id} />
    </main>
  );
}
