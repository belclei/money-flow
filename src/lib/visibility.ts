import { prisma } from "@/lib/db/prisma";

export async function transactionVisibilityWhere(userId: string) {
  const [aliases, grants] = await Promise.all([
    prisma.portadorAlias.findMany({ where: { granteeUserId: userId } }),
    prisma.accountAccess.findMany({ where: { granteeId: userId }, select: { accountId: true } }),
  ]);

  return {
    OR: [
      // Owner da conta vê todas as transações dela
      { invoice: { account: { userId } } },
      // Portador: vê transações onde seu nome aparece, dentro da conta do owner que criou o alias
      ...aliases.map((a) => ({
        cardHolder: a.name,
        invoice: { account: { userId: a.ownerUserId } },
      })),
      // Acesso explícito concedido: vê todas as transações da conta
      ...(grants.length > 0
        ? [{ invoice: { accountId: { in: grants.map((g) => g.accountId) } } }]
        : []),
      // Transações manuais próprias (source = manual, sem invoice)
      { userId, invoiceId: null },
    ],
  };
}

export async function accountVisibilityWhere(userId: string) {
  const grants = await prisma.accountAccess.findMany({
    where: { granteeId: userId },
    select: { accountId: true },
  });

  return {
    OR: [
      { userId },
      ...(grants.length > 0 ? [{ id: { in: grants.map((g) => g.accountId) } }] : []),
    ],
  };
}
