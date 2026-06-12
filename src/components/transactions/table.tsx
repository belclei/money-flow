import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Purchase = {
  id: string;
  description: string;
  installmentCount: number;
  cardHolder: string | null;
};

export type Transaction = {
  id: string;
  date: Date | string;
  description: string;
  amount: number;
  currency: string;
  amountBRL: number | null;
  category: string | null;
  cardHolder: string | null;
  cardBrand: string | null;
  installmentNumber: number | null;
  purchase: Purchase | null;
};

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("pt-BR");
}

function groupTransactions(
  transactions: Transaction[],
  groupBy: "bank" | "holder" | undefined
): { key: string; label: string; items: Transaction[]; total: number }[] {
  if (!groupBy) return [{ key: "all", label: "", items: transactions, total: 0 }];

  const groups = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const key =
      groupBy === "bank"
        ? (t.cardBrand ?? "Sem banco")
        : (t.cardHolder ?? t.purchase?.cardHolder ?? "Sem portador");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  return Array.from(groups.entries()).map(([key, items]) => ({
    key,
    label: key,
    items,
    total: items
      .filter((t) => t.amount > 0 && t.currency === "BRL")
      .reduce((s, t) => s + t.amount, 0),
  }));
}

export function TransactionTable({
  transactions,
  groupBy,
}: {
  transactions: Transaction[];
  groupBy?: "bank" | "holder";
}) {
  if (transactions.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Nenhuma transação encontrada.
      </p>
    );
  }

  const groups = groupTransactions(transactions, groupBy);

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Categoria</TableHead>
            {!groupBy && <TableHead>Banco / Portador</TableHead>}
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <>
              {groupBy && (
                <TableRow key={`header-${group.key}`} className="bg-muted/50 hover:bg-muted/50">
                  <TableCell colSpan={4} className="py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{group.label}</span>
                      {group.total > 0 && (
                        <span className="text-sm text-muted-foreground tabular-nums">
                          {formatAmount(group.total, "BRL")}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {group.items.map((t) => {
                const isInstallment = t.installmentNumber != null && t.purchase != null;
                const isExpense = t.amount > 0;
                const holder = t.cardHolder ?? t.purchase?.cardHolder;

                return (
                  <TableRow key={t.id}>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {formatDate(t.date)}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm">{t.description}</span>
                        {isInstallment && (
                          <span className="text-xs text-muted-foreground">
                            Parcela {t.installmentNumber}/{t.purchase!.installmentCount}
                            {" · "}{t.purchase!.description}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      {t.category && (
                        <Badge variant="secondary" className="text-xs">
                          {t.category}
                        </Badge>
                      )}
                    </TableCell>

                    {!groupBy && (
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex flex-col gap-0.5">
                          {t.cardBrand && <span>{t.cardBrand}</span>}
                          {holder && (
                            <span className="text-xs">{holder}</span>
                          )}
                        </div>
                      </TableCell>
                    )}

                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span
                          className={`text-sm font-medium tabular-nums ${
                            isExpense ? "" : "text-green-600"
                          }`}
                        >
                          {isExpense ? "" : "+ "}
                          {formatAmount(t.amount, t.currency)}
                          {t.currency !== "BRL" && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              {t.currency}
                            </span>
                          )}
                        </span>
                        {t.amountBRL != null && t.currency !== "BRL" && (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {formatAmount(t.amountBRL, "BRL")}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
