type Item = { label: string; total: number };

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(v);
}

export function BreakdownBar({ data }: { data: Item[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">—</p>
    );
  }

  const max = Math.max(...data.map((d) => d.total));

  return (
    <ul className="space-y-3">
      {data.map((item) => (
        <li key={item.label} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="truncate max-w-[60%]">{item.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {formatBRL(item.total)}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(item.total / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
