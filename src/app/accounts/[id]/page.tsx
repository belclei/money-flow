import { Upload } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Suspense } from "react";
import { MonthSelector } from "@/components/dashboard/month-selector";
import { Pagination } from "@/components/transactions/pagination";
import { TransactionTable } from "@/components/transactions/table";
import { buttonVariants } from "@/components/ui/button";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { cn } from "@/lib/utils";
import { ACCOUNT_TYPE_LABELS } from "@/lib/validators/account";

const LIMIT = 50;

function formatBRL(v: number) {
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(v);
}

function currentMonth() {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface Props {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ month?: string; page?: string }>;
}

export default async function AccountDetailPage({
	params,
	searchParams,
}: Props) {
	const session = await getServerSession(authOptions);
	if (!session) redirect("/auth/login");

	const { id } = await params;
	const sp = await searchParams;
	const selectedMonth = sp.month ?? currentMonth();
	const page = Math.max(1, Number(sp.page ?? 1));

	const account = await prisma.account.findUnique({ where: { id } });
	if (!account || account.userId !== session.user.id) notFound();

	const [y, m] = selectedMonth.split("-").map(Number);
	const monthStart = new Date(y, m - 1, 1);
	const monthEnd = new Date(y, m, 1);

	const where = {
		accountId: id,
		date: { gte: monthStart, lt: monthEnd },
	};

	const [transactions, total] = await prisma.$transaction([
		prisma.transaction.findMany({
			where,
			orderBy: { date: "desc" },
			skip: (page - 1) * LIMIT,
			take: LIMIT,
			include: { purchase: true },
		}),
		prisma.transaction.count({ where }),
	]);

	const totalOut = transactions
		.filter((t) => t.amount > 0)
		.reduce((s, t) => s + t.amount, 0);

	const totalIn = transactions
		.filter((t) => t.amount < 0)
		.reduce((s, t) => s + Math.abs(t.amount), 0);

	const overdraftUsed =
		account.limit != null && account.limit > 0 && account.currentBalance < 0
			? Math.min(account.limit, Math.abs(account.currentBalance))
			: 0;

	const overdraftPct =
		account.limit != null && account.limit > 0
			? Math.min(100, (overdraftUsed / account.limit) * 100)
			: null;

	const typeLabel =
		ACCOUNT_TYPE_LABELS[account.type as keyof typeof ACCOUNT_TYPE_LABELS] ??
		account.type;

	const selectedMonthLabel = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
		month: "long",
		year: "numeric",
	});

	return (
		<main className="container mx-auto max-w-5xl p-6 space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between flex-wrap gap-3">
				<div>
					<div className="flex items-center gap-2 mb-1">
						<Link
							href="/accounts"
							className="text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							← Contas
						</Link>
					</div>
					<h1 className="text-2xl font-semibold">{account.name}</h1>
					<p className="text-sm text-muted-foreground">
						{typeLabel}
						{account.institution ? ` · ${account.institution}` : ""}
					</p>
				</div>
				<Link
					href={`/upload?conta=${id}`}
					className={cn(buttonVariants({ size: "sm" }))}
				>
					<Upload className="w-4 h-4 mr-1.5" />
					Importar extrato
				</Link>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
				<div className="rounded-lg border p-4">
					<p className="text-xs text-muted-foreground mb-1">Saldo atual</p>
					<p
						className={`text-xl font-semibold tabular-nums ${account.currentBalance < 0 ? "text-red-600" : "text-emerald-600"}`}
					>
						{formatBRL(account.currentBalance)}
					</p>
				</div>

				<div className="rounded-lg border p-4">
					<p className="text-xs text-muted-foreground mb-1">Entradas no mês</p>
					<p className="text-xl font-semibold tabular-nums text-emerald-600">
						{formatBRL(totalIn)}
					</p>
				</div>

				<div className="rounded-lg border p-4">
					<p className="text-xs text-muted-foreground mb-1">Saídas no mês</p>
					<p className="text-xl font-semibold tabular-nums text-red-600">
						{formatBRL(totalOut)}
					</p>
				</div>

				{account.limit != null && account.limit > 0 && (
					<div className="rounded-lg border p-4 col-span-2 sm:col-span-1">
						<p className="text-xs text-muted-foreground mb-2">
							Cheque especial — {formatBRL(overdraftUsed)} de{" "}
							{formatBRL(account.limit)}
						</p>
						<div className="h-2 rounded-full bg-muted overflow-hidden">
							<div
								className="h-full rounded-full bg-amber-500"
								style={{ width: `${overdraftPct}%` }}
							/>
						</div>
					</div>
				)}
			</div>

			{/* Transactions */}
			<div className="space-y-4">
				<div className="flex items-center justify-between flex-wrap gap-3">
					<div>
						<h2 className="text-base font-semibold">Transações</h2>
						<p className="text-sm text-muted-foreground mt-0.5 capitalize">
							{total} registro{total !== 1 ? "s" : ""}
							{" — "}
							{selectedMonthLabel}
						</p>
					</div>
					<Suspense>
						<MonthSelector selected={selectedMonth} />
					</Suspense>
				</div>

				{transactions.length === 0 ? (
					<div className="rounded-lg border border-dashed p-12 text-center">
						<p className="text-muted-foreground text-sm">
							Nenhuma transação neste mês.
						</p>
						<Link
							href={`/upload?conta=${id}`}
							className={cn(
								buttonVariants({ variant: "outline", size: "sm" }),
								"mt-4 inline-flex gap-1.5",
							)}
						>
							<Upload className="w-4 h-4" />
							Importar extrato
						</Link>
					</div>
				) : (
					<>
						<TransactionTable transactions={transactions} />
						<Suspense>
							<Pagination page={page} total={total} limit={LIMIT} />
						</Suspense>
					</>
				)}
			</div>
		</main>
	);
}
