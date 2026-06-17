// Pure calculation functions — no Prisma imports, deterministic, testable.

interface AccountSnap {
  type: string;
  currentBalance: number;
  dueDay: number | null;
}

interface RecurringSnap {
  kind: string;
  isActive: boolean;
  dayOfMonth: number;
  amount: number;
  endDate: Date | null;
}

// Σ assets − Σ credit card debt
export function calcNetWorth(accounts: AccountSnap[]): number {
  return accounts.reduce(
    (sum, a) => (a.type === "credit_card" ? sum - a.currentBalance : sum + a.currentBalance),
    0,
  );
}

// Saldo líquido − faturas não vencidas − despesas fixas ainda por vir no mês
export function calcFreeMoney(accounts: AccountSnap[], recurrings: RecurringSnap[]): {
  total: number;
  liquidBalance: number;
  creditDebt: number;
  remainingExpenses: number;
} {
  const today = new Date();
  const day = today.getDate();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const liquidBalance = accounts
    .filter((a) => a.type === "checking" || a.type === "cash")
    .reduce((sum, a) => sum + a.currentBalance, 0);

  // Only subtract credit card balances whose due date hasn't passed yet this month.
  // Cards with no dueDay are always considered "not yet paid".
  const creditDebt = accounts
    .filter((a) => a.type === "credit_card")
    .filter((a) => a.dueDay === null || a.dueDay >= day)
    .reduce((sum, a) => sum + a.currentBalance, 0);

  const remainingExpenses = recurrings
    .filter(
      (r) =>
        r.kind === "expense" &&
        r.isActive &&
        r.dayOfMonth >= day &&
        (r.endDate === null || r.endDate >= startOfToday),
    )
    .reduce((sum, r) => sum + r.amount, 0);

  return {
    total: liquidBalance - creditDebt - remainingExpenses,
    liquidBalance,
    creditDebt,
    remainingExpenses,
  };
}

// FreeMoney + receitas fixas ainda por vir no mês
export function calcMonthForecast(
  accounts: AccountSnap[],
  recurrings: RecurringSnap[],
): { total: number; remainingIncome: number } {
  const today = new Date();
  const day = today.getDate();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const remainingIncome = recurrings
    .filter(
      (r) =>
        r.kind === "income" &&
        r.isActive &&
        r.dayOfMonth >= day &&
        (r.endDate === null || r.endDate >= startOfToday),
    )
    .reduce((sum, r) => sum + r.amount, 0);

  const { total: freeMoney } = calcFreeMoney(accounts, recurrings);

  return { total: freeMoney + remainingIncome, remainingIncome };
}
