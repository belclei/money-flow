// Pure calculation functions — no Prisma imports, deterministic, testable.

interface AccountSnap {
  type: string;
  currentBalance: number;
}

interface CreditCardSnap {
  currentBill: number;
  dueDay: number;
}

interface RecurringSnap {
  kind: string;
  isActive: boolean;
  dayOfMonth: number;
  amount: number;
  endDate: Date | null;
}

// Σ assets − Σ credit card bills
export function calcNetWorth(accounts: AccountSnap[], creditCards: CreditCardSnap[]): number {
  const assets = accounts.reduce((sum, a) => sum + a.currentBalance, 0);
  const debt = creditCards.reduce((sum, c) => sum + c.currentBill, 0);
  return assets - debt;
}

// Saldo líquido − faturas não vencidas − despesas fixas ainda por vir
export function calcFreeMoney(
  accounts: AccountSnap[],
  creditCards: CreditCardSnap[],
  recurrings: RecurringSnap[],
): { total: number; liquidBalance: number; creditDebt: number; remainingExpenses: number } {
  const today = new Date();
  const day = today.getDate();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const liquidBalance = accounts
    .filter((a) => a.type === "checking" || a.type === "cash")
    .reduce((sum, a) => sum + a.currentBalance, 0);

  const creditDebt = creditCards
    .filter((c) => c.dueDay >= day)
    .reduce((sum, c) => sum + c.currentBill, 0);

  const remainingExpenses = recurrings
    .filter(
      (r) =>
        r.kind === "expense" &&
        r.isActive &&
        r.dayOfMonth >= day &&
        (r.endDate === null || r.endDate >= startOfToday),
    )
    .reduce((sum, r) => sum + r.amount, 0);

  return { total: liquidBalance - creditDebt - remainingExpenses, liquidBalance, creditDebt, remainingExpenses };
}

// FreeMoney + receitas fixas ainda por vir
export function calcMonthForecast(
  accounts: AccountSnap[],
  creditCards: CreditCardSnap[],
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

  const { total: freeMoney } = calcFreeMoney(accounts, creditCards, recurrings);
  return { total: freeMoney + remainingIncome, remainingIncome };
}
