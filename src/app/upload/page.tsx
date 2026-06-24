"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	DedupTable,
	type DupAction,
	type DupConflict,
} from "@/components/upload/dedup-table";
import {
	ReviewTable,
	type ReviewTransaction,
} from "@/components/upload/review-table";

type CreditCard = { id: string; name: string; institution: string | null };
type Account = {
	id: string;
	name: string;
	institution: string | null;
	type: string;
};

type Meta = {
	filename: string;
	cardBrand?: string;
	cardHolder?: string;
	month: string;
	detectedCardBrand?: string;
	contentHash?: string;
	creditCardId?: string;
	importType: "fatura" | "extrato";
	accountId?: string;
};

type UploadState =
	| { status: "idle" }
	| { status: "uploading" }
	| { status: "password_required"; file: File }
	| {
			status: "duplicate_ask";
			file: File;
			invoiceId: string;
			filename: string;
			uploadedAt: string;
	  }
	| { status: "review"; transactions: ReviewTransaction[]; meta: Meta }
	| {
			status: "checking_duplicates";
			transactions: ReviewTransaction[];
			meta: Meta;
	  }
	| {
			status: "deduplication";
			conflicts: DupConflict[];
			transactions: ReviewTransaction[];
			meta: Meta;
	  }
	| { status: "confirming" }
	| { status: "link_portadores"; unknownNames: string[]; count: number }
	| { status: "success"; count: number }
	| { status: "error"; message: string };

function UploadPageInner() {
	const searchParams = useSearchParams();
	const [state, setState] = useState<UploadState>({ status: "idle" });
	const [dragging, setDragging] = useState(false);
	const [password, setPassword] = useState("");
	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [importType, setImportType] = useState<"fatura" | "extrato">("fatura");
	const [creditCardId, setCreditCardId] = useState(
		searchParams.get("cartao") ?? "",
	);
	const [accountId, setAccountId] = useState(searchParams.get("conta") ?? "");
	const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
	const [accounts, setAccounts] = useState<Account[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		fetch("/api/credit-cards")
			.then((r) => r.json())
			.then((d) => setCreditCards(d.cards ?? []));
		fetch("/api/accounts")
			.then((r) => r.json())
			.then((d) => setAccounts(d.accounts ?? []));
	}, []);

	const uploadFile = useCallback(
		async (file: File, pwd?: string) => {
			const fd = new FormData();
			fd.append("file", file);
			fd.append("importType", importType);
			if (pwd) fd.append("password", pwd);
			if (importType === "fatura" && creditCardId)
				fd.append("creditCardId", creditCardId);
			if (importType === "extrato" && accountId)
				fd.append("accountId", accountId);
			return fetch("/api/upload", { method: "POST", body: fd });
		},
		[importType, creditCardId, accountId],
	);

	const saveTransactions = useCallback(
		async (
			transactions: ReviewTransaction[],
			meta: Meta,
			replaceIds: string[],
		) => {
			setState({ status: "confirming" });

			const res = await fetch("/api/upload/confirm", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ transactions, meta, replaceIds }),
			});
			const data = await res.json().catch(() => ({}));

			if (data.status === "ok") {
				const count =
					data.invoice?.transactions?.length ??
					data.statement?.transactions?.length ??
					0;
				if (data.unknownCardHolders?.length > 0) {
					setState({
						status: "link_portadores",
						unknownNames: data.unknownCardHolders,
						count,
					});
				} else {
					setState({ status: "success", count });
				}
			} else {
				setState({
					status: "error",
					message: data.error ?? "Falha ao salvar.",
				});
			}
		},
		[],
	);

	const handleFile = useCallback(
		async (file: File) => {
			if (!file.name.toLowerCase().endsWith(".pdf")) {
				setState({
					status: "error",
					message: "Apenas arquivos PDF são aceitos.",
				});
				return;
			}
			if (importType === "extrato" && !accountId) {
				setState({
					status: "error",
					message: "Selecione uma conta antes de importar o extrato.",
				});
				return;
			}
			setState({ status: "uploading" });

			const res = await uploadFile(file);
			const data = await res.json().catch(() => ({}));

			if (!res.ok && res.status !== 200 && data.status !== "duplicate_ask") {
				setState({
					status: "error",
					message: data.error ?? "Falha no upload.",
				});
				return;
			}

			if (data.status === "duplicate_ask") {
				setState({
					status: "duplicate_ask",
					file,
					invoiceId: data.invoiceId,
					filename: data.filename,
					uploadedAt: data.uploadedAt,
				});
			} else if (data.status === "password_required") {
				setState({ status: "password_required", file });
			} else if (data.status === "preview") {
				setState({
					status: "review",
					transactions: data.transactions,
					meta: {
						...data.meta,
						importType,
						creditCardId:
							importType === "fatura" ? creditCardId || undefined : undefined,
						accountId:
							importType === "extrato" ? accountId || undefined : undefined,
					},
				});
			} else {
				setState({
					status: "error",
					message: data.error ?? "Erro desconhecido.",
				});
			}
		},
		[uploadFile, importType, creditCardId, accountId],
	);

	const handleReplace = useCallback(async () => {
		if (state.status !== "duplicate_ask") return;
		const deleteRes = await fetch(
			`/api/upload/replace?invoiceId=${state.invoiceId}`,
			{ method: "DELETE" },
		);
		if (!deleteRes.ok) {
			setState({
				status: "error",
				message: "Falha ao deletar fatura anterior.",
			});
			return;
		}
		await handleFile(state.file);
	}, [state, handleFile]);

	const handleKeepExisting = useCallback(() => {
		setState({ status: "idle" });
		if (fileInputRef.current) fileInputRef.current.value = "";
	}, []);

	const handlePasswordSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			if (state.status !== "password_required") return;
			setPasswordError(null);
			setState({ status: "uploading" });

			const res = await uploadFile(state.file, password);
			const data = await res.json().catch(() => ({}));

			if (data.status === "password_required") {
				setState({ status: "password_required", file: state.file });
				setPasswordError("Senha incorreta. Tente novamente.");
				return;
			}
			if (data.status === "duplicate_ask") {
				setState({
					status: "duplicate_ask",
					file: state.file,
					invoiceId: data.invoiceId,
					filename: data.filename,
					uploadedAt: data.uploadedAt,
				});
				return;
			}
			if (data.status === "preview") {
				setPassword("");
				setState({
					status: "review",
					transactions: data.transactions,
					meta: {
						...data.meta,
						importType,
						creditCardId:
							importType === "fatura" ? creditCardId || undefined : undefined,
						accountId:
							importType === "extrato" ? accountId || undefined : undefined,
					},
				});
			} else {
				setState({
					status: "error",
					message: data.error ?? "Falha no upload.",
				});
			}
		},
		[state, password, uploadFile, importType, creditCardId, accountId],
	);

	const handleConfirm = useCallback(
		async (transactions: ReviewTransaction[]) => {
			if (state.status !== "review") return;
			const meta = state.meta;
			setState({ status: "checking_duplicates", transactions, meta });

			const res = await fetch("/api/upload/check-duplicates", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ transactions }),
			});
			const data = await res.json().catch(() => ({}));

			if (!res.ok) {
				setState({
					status: "error",
					message: data.error ?? "Falha ao verificar duplicatas.",
				});
				return;
			}

			if (data.conflicts && data.conflicts.length > 0) {
				setState({
					status: "deduplication",
					conflicts: data.conflicts,
					transactions,
					meta,
				});
			} else {
				await saveTransactions(transactions, meta, []);
			}
		},
		[state, saveTransactions],
	);

	const handleResolveDedup = useCallback(
		async (
			resolutions: { index: number; action: DupAction; existingId: string }[],
		) => {
			if (state.status !== "deduplication") return;
			const { transactions, meta } = state;

			const replaceIds = resolutions
				.filter((r) => r.action === "replace")
				.map((r) => r.existingId);

			const skipIndices = new Set(
				resolutions.filter((r) => r.action === "skip").map((r) => r.index),
			);

			const finalTransactions = transactions.filter(
				(_, i) => !skipIndices.has(i),
			);

			await saveTransactions(finalTransactions, meta, replaceIds);
		},
		[state, saveTransactions],
	);

	const reset = () => {
		setState({ status: "idle" });
		setPassword("");
		setPasswordError(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	// Review and checking_duplicates screens take full width
	if (state.status === "review" || state.status === "checking_duplicates") {
		return (
			<main className="container mx-auto max-w-5xl p-6 space-y-4">
				<div>
					<h1 className="text-2xl font-semibold">Revisar importação</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Confira e edite as transações antes de confirmar.
					</p>
				</div>
				<ReviewTable
					initial={state.status === "review" ? state.transactions : []}
					onConfirm={handleConfirm}
					onCancel={reset}
					loading={state.status === "checking_duplicates"}
				/>
			</main>
		);
	}

	// Deduplication screen
	if (state.status === "deduplication") {
		return (
			<main className="container mx-auto max-w-5xl p-6 space-y-4">
				<div>
					<h1 className="text-2xl font-semibold">Verificar duplicatas</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Estas transações já existem no sistema. Decida o que fazer com cada
						uma.
					</p>
				</div>
				<DedupTable
					conflicts={state.conflicts}
					onConfirm={handleResolveDedup}
					onCancel={reset}
					loading={false}
				/>
			</main>
		);
	}

	// Confirming screen
	if (state.status === "confirming") {
		return (
			<main className="container mx-auto max-w-5xl p-6 space-y-4">
				<div>
					<h1 className="text-2xl font-semibold">Salvando…</h1>
				</div>
				<Progress value={null} className="h-1" />
			</main>
		);
	}

	// Link portadores screen
	if (state.status === "link_portadores") {
		return (
			<LinkPortadoresScreen
				names={state.unknownNames}
				count={state.count}
				onDone={reset}
			/>
		);
	}

	const pageTitle =
		importType === "extrato" ? "Importar extrato" : "Importar fatura";

	return (
		<main className="container mx-auto max-w-2xl p-6 space-y-6">
			<h1 className="text-2xl font-semibold">{pageTitle}</h1>

			{/* Type selector */}
			<div className="space-y-2">
				<Label>Tipo de documento</Label>
				<div className="flex gap-2">
					{(["fatura", "extrato"] as const).map((type) => (
						<button
							type="button"
							key={type}
							onClick={() => setImportType(type)}
							className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
								importType === type
									? "border-primary bg-primary/5 text-primary"
									: "border-muted-foreground/30 text-muted-foreground hover:border-primary/60"
							}`}
						>
							{type === "fatura" ? "Fatura de cartão" : "Extrato de conta"}
						</button>
					))}
				</div>
			</div>

			{/* Card selector (for fatura) */}
			{importType === "fatura" && (
				<div className="space-y-2">
					<Label>Cartão de crédito</Label>
					<Select
						value={creditCardId || "none"}
						onValueChange={(v) =>
							setCreditCardId(v === "none" ? "" : (v ?? ""))
						}
					>
						<SelectTrigger>
							<SelectValue placeholder="Selecionar cartão (opcional)" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="none">— Sem cartão associado —</SelectItem>
							{creditCards.map((c) => (
								<SelectItem key={c.id} value={c.id}>
									{c.name}
									{c.institution ? ` — ${c.institution}` : ""}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{creditCards.length === 0 && (
						<p className="text-xs text-muted-foreground">
							Nenhum cartão cadastrado.{" "}
							<a href="/cartoes" className="underline">
								Cadastre um cartão
							</a>{" "}
							para vincular a fatura.
						</p>
					)}
				</div>
			)}

			{/* Account selector (for extrato) */}
			{importType === "extrato" && (
				<div className="space-y-2">
					<Label>Conta corrente</Label>
					<Select
						value={accountId || "none"}
						onValueChange={(v) => setAccountId(v === "none" ? "" : (v ?? ""))}
					>
						<SelectTrigger>
							<SelectValue placeholder="Selecionar conta" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="none">— Selecione uma conta —</SelectItem>
							{accounts.map((a) => (
								<SelectItem key={a.id} value={a.id}>
									{a.name}
									{a.institution ? ` — ${a.institution}` : ""}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{accounts.length === 0 && (
						<p className="text-xs text-muted-foreground">
							Nenhuma conta cadastrada.{" "}
							<a href="/accounts" className="underline">
								Cadastre uma conta
							</a>{" "}
							para importar extratos.
						</p>
					)}
					{accountId === "" && accounts.length > 0 && (
						<p className="text-xs text-amber-600">
							Selecione uma conta para continuar.
						</p>
					)}
				</div>
			)}

			<div
				onDragOver={(e) => {
					e.preventDefault();
					setDragging(true);
				}}
				onDragLeave={() => setDragging(false)}
				onDrop={(e) => {
					e.preventDefault();
					setDragging(false);
					const f = e.dataTransfer.files[0];
					if (f) handleFile(f);
				}}
				onClick={() => fileInputRef.current?.click()}
				className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors ${
					dragging
						? "border-primary bg-primary/5"
						: "border-muted-foreground/30 hover:border-primary/60"
				}`}
			>
				<p className="text-sm text-muted-foreground">
					Arraste o PDF aqui, ou clique para selecionar
				</p>
				<input
					ref={fileInputRef}
					type="file"
					accept="application/pdf"
					className="hidden"
					onChange={(e) => {
						const f = e.target.files?.[0];
						if (f) handleFile(f);
					}}
				/>
			</div>

			{state.status === "uploading" && (
				<div className="space-y-2">
					<p className="text-sm text-muted-foreground">
						Extraindo e processando…
					</p>
					<Progress value={null} className="h-1" />
				</div>
			)}

			{state.status === "success" && (
				<div className="rounded-lg border border-green-200 bg-green-50 p-4">
					<p className="text-sm text-green-800">
						{state.count} transaç
						{state.count !== 1 ? "ões importadas" : "ão importada"} com sucesso.
					</p>
					<Button variant="outline" size="sm" className="mt-2" onClick={reset}>
						Importar outro
					</Button>
				</div>
			)}

			{state.status === "error" && (
				<div className="rounded-lg border border-red-200 bg-red-50 p-4">
					<p className="text-sm text-red-800">{state.message}</p>
					<Button variant="outline" size="sm" className="mt-2" onClick={reset}>
						Tentar novamente
					</Button>
				</div>
			)}

			<Dialog
				open={state.status === "password_required"}
				onOpenChange={(open) => {
					if (!open) reset();
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>PDF protegido por senha</DialogTitle>
					</DialogHeader>
					<form onSubmit={handlePasswordSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="pdf-password">Senha</Label>
							<Input
								id="pdf-password"
								type="password"
								autoFocus
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</div>
						{passwordError && (
							<p className="text-sm text-red-500">{passwordError}</p>
						)}
						<div className="flex gap-2">
							<Button type="submit" disabled={!password}>
								Desbloquear e importar
							</Button>
							<Button type="button" variant="outline" onClick={reset}>
								Cancelar
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog
				open={state.status === "duplicate_ask"}
				onOpenChange={(open) => {
					if (!open) handleKeepExisting();
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{importType === "extrato"
								? "Extrato já importado"
								: "Fatura já importada"}
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<p className="text-sm text-muted-foreground mb-2">
								Este arquivo já foi importado anteriormente:
							</p>
							<p className="text-sm font-medium">
								{state.status === "duplicate_ask" ? state.filename : "—"}
							</p>
							{state.status === "duplicate_ask" && (
								<p className="text-xs text-muted-foreground mt-1">
									Importado em{" "}
									{new Date(state.uploadedAt).toLocaleDateString("pt-BR")}
								</p>
							)}
						</div>
						<p className="text-sm">
							Deseja substituir os dados anteriores por uma nova extração?
						</p>
						<div className="flex gap-2">
							<Button variant="destructive" onClick={handleReplace}>
								Sim, substituir
							</Button>
							<Button variant="outline" onClick={handleKeepExisting}>
								Não, manter dados existentes
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</main>
	);
}

export default function UploadPage() {
	return (
		<Suspense>
			<UploadPageInner />
		</Suspense>
	);
}

// ─── Link portadores screen ───────────────────────────────────────────────────

function LinkPortadoresScreen({
	names,
	count,
	onDone,
}: {
	names: string[];
	count: number;
	onDone: () => void;
}) {
	const [users, setUsers] = useState<{ id: string; email: string }[]>([]);
	const [selections, setSelections] = useState<Record<string, string>>({});
	const [saved, setSaved] = useState<Set<string>>(new Set());
	const [loading, setLoading] = useState<string | null>(null);

	useEffect(() => {
		fetch("/api/users")
			.then((r) => r.json())
			.then((d) => setUsers(d.users ?? []));
	}, []);

	async function handleLink(name: string) {
		const userId = selections[name];
		if (!userId) return;
		setLoading(name);
		const res = await fetch("/api/portadores", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, granteeUserId: userId }),
		});
		if (res.ok) setSaved((prev) => new Set([...prev, name]));
		setLoading(null);
	}

	const remaining = names.filter((n) => !saved.has(n));

	return (
		<main className="container mx-auto max-w-xl p-6 space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Portadores identificados</h1>
				<p className="text-sm text-muted-foreground mt-1">
					{count} transaç{count !== 1 ? "ões importadas" : "ão importada"} com
					sucesso.
					{remaining.length > 0
						? " Encontramos portadores ainda não mapeados a usuários do sistema."
						: " Todos os portadores foram mapeados."}
				</p>
			</div>

			{remaining.length > 0 ? (
				<div className="space-y-4">
					{remaining.map((name) => (
						<div key={name} className="rounded-lg border p-4 space-y-3">
							<p className="font-medium text-sm">{name}</p>
							<div className="flex gap-2">
								<Select
									value={selections[name] ?? ""}
									onValueChange={(v) =>
										setSelections((prev) => ({ ...prev, [name]: v ?? "" }))
									}
								>
									<SelectTrigger className="flex-1">
										<SelectValue placeholder="Selecionar usuário" />
									</SelectTrigger>
									<SelectContent>
										{users.map((u) => (
											<SelectItem key={u.id} value={u.id}>
												{u.email}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Button
									size="sm"
									onClick={() => handleLink(name)}
									disabled={!selections[name] || loading === name}
								>
									{loading === name ? "…" : "Vincular"}
								</Button>
								<Button
									size="sm"
									variant="outline"
									onClick={() => setSaved((prev) => new Set([...prev, name]))}
								>
									Pular
								</Button>
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="rounded-lg border border-green-200 bg-green-50 p-4">
					<p className="text-sm text-green-800">
						Todos os portadores foram tratados.
					</p>
				</div>
			)}

			<Button
				onClick={onDone}
				variant={remaining.length > 0 ? "outline" : "default"}
			>
				{remaining.length > 0 ? "Concluir sem vincular restantes" : "Concluir"}
			</Button>
		</main>
	);
}
