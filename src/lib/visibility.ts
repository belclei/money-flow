import { prisma } from "@/lib/db/prisma";

export async function transactionVisibilityWhere(userId: string) {
  const [aliases, accountGrants, cardGrants] = await Promise.all([
    prisma.portadorAlias.findMany({ where: { granteeUserId: userId } }),
    prisma.accountAccess.findMany({ where: { granteeId: userId }, select: { accountId: true } }),
    prisma.creditCardAccess.findMany({ where: { granteeId: userId }, select: { creditCardId: true } }),
  ]);

  return {
    OR: [
      // Dono do cartão — vê todas as transações das suas faturas
      { invoice: { creditCard: { userId } } },
      // Portador — vê transações onde seu nome aparece
      ...aliases.map((a) => ({
        cardHolder: a.name,
        invoice: { creditCard: { userId: a.ownerUserId } },
      })),
      // Acesso explícito concedido ao cartão
      ...(cardGrants.length > 0
        ? [{ invoice: { creditCardId: { in: cardGrants.map((g) => g.creditCardId) } } }]
        : []),
      // Acesso a contas (mantido para transações manuais futuras)
      ...(accountGrants.length > 0
        ? [{ invoice: { is: null }, userId }]
        : []),
      // Transações manuais do próprio usuário
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

export async function creditCardVisibilityWhere(userId: string) {
  const grants = await prisma.creditCardAccess.findMany({
    where: { granteeId: userId },
    select: { creditCardId: true },
  });

  return {
    OR: [
      { userId },
      ...(grants.length > 0 ? [{ id: { in: grants.map((g) => g.creditCardId) } }] : []),
    ],
  };
}
