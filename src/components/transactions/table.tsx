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

type Transaction = {
  id: string;
  date: Date | string;
  description: string;
  amount: number;
  currency: string;
  amountBRL: number | null;
  category: string | null;
  cardHolder: string | null;
  installmentNumber: number | null;
  purchase: Purchase | null;
};

function formatAmount(amount: number, currency: string) {
  const locale = currency === "BRL" ? "pt-BR" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("pt-BR");
}

export function TransactionTable({
  transactions,
}: {
  transactions: Transaction[];
}) {
  if (transactions.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Nenhuma transação encontrada.
      </p>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Portador</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((t) => {
            const isInstallment = t.installmentNumber != null && t.purchase != null;
            const isExpense = t.amount > 0;

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
                        {" · "}
                        {t.purchase!.description}
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

                <TableCell className="text-sm text-muted-foreground">
                  {t.cardHolder ?? t.purchase?.cardHolder ?? "—"}
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex flex-col items-end gap-0.5">
                    <span
                      className={`text-sm font-medium tabular-nums ${
                        isExpense ? "text-foreground" : "text-green-600"
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
        </TableBody>
      </Table>
    </div>
  );
}
