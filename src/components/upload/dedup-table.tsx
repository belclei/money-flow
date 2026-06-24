"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { ReviewTransaction } from "./review-table";

export type DupAction = "skip" | "keep_both" | "replace";

export type DupConflict = {
	index: number;
	incoming: ReviewTransaction;
	existing: {
		id: string;
		date: string;
		description: string;
		amount: number;
		currency: string;
		source: string;
		paymentMethod: string;
	};
};

function fmt(amount: number, currency: string) {
	return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
		amount,
	);
}

function sourceLabel(source: string) {
	if (source === "manual") return "manual";
	if (source === "pdf_import") return "fatura";
	if (source === "statement_import") return "extrato";
	return source;
}

export function DedupTable({
	conflicts,
	onConfirm,
	onCancel,
	loading,
}: {
	conflicts: DupConflict[];
	onConfirm: (
		resolutions: { index: number; action: DupAction; existingId: string }[],
	) => void;
	onCancel: () => void;
	loading: boolean;
}) {
	const [actions, setActions] = useState<Record<number, DupAction>>(
		Object.fromEntries(conflicts.map((c) => [c.index, "skip"])),
	);

	function setAll(action: DupAction) {
		setActions(Object.fromEntries(conflicts.map((c) => [c.index, action])));
	}

	function handleConfirm() {
		onConfirm(
			conflicts.map((c) => ({
				index: c.index,
				action: actions[c.index] ?? "skip",
				existingId: c.existing.id,
			})),
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm text-muted-foreground">
						{conflicts.length} transaç{conflicts.length !== 1 ? "ões" : "ão"}{" "}
						com possível duplicata. Escolha o que fazer com cada uma.
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={onCancel}
						disabled={loading}
					>
						Cancelar
					</Button>
					<Button size="sm" onClick={handleConfirm} disabled={loading}>
						{loading ? "Salvando…" : "Confirmar resoluções"}
					</Button>
				</div>
			</div>

			<div className="flex gap-2 text-xs">
				<span className="text-muted-foreground">Definir todas como:</span>
				<button
					type="button"
					onClick={() => setAll("skip")}
					className="underline hover:text-foreground text-muted-foreground"
				>
					pular nova
				</button>
				<button
					type="button"
					onClick={() => setAll("keep_both")}
					className="underline hover:text-foreground text-muted-foreground"
				>
					manter as duas
				</button>
				<button
					type="button"
					onClick={() => setAll("replace")}
					className="underline hover:text-foreground text-muted-foreground"
				>
					substituir existente
				</button>
			</div>

			<div className="rounded-lg border overflow-auto max-h-[65vh]">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-28">Data</TableHead>
							<TableHead>Descrição (nova)</TableHead>
							<TableHead>Descrição (existente)</TableHead>
							<TableHead className="w-28 text-right">Valor</TableHead>
							<TableHead className="w-52">Ação</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{conflicts.map((c) => (
							<TableRow key={c.index}>
								<TableCell className="text-xs">{c.incoming.date}</TableCell>
								<TableCell className="text-xs">
									{c.incoming.description}
								</TableCell>
								<TableCell className="text-xs">
									<span>{c.existing.description}</span>
									<span className="ml-1 text-muted-foreground">
										({sourceLabel(c.existing.source)})
									</span>
								</TableCell>
								<TableCell className="text-xs text-right">
									{fmt(c.incoming.amount, c.incoming.currency)}
								</TableCell>
								<TableCell>
									<div className="flex gap-1">
										{(["skip", "keep_both", "replace"] as DupAction[]).map(
											(action) => (
												<button
													type="button"
													key={action}
													onClick={() =>
														setActions((prev) => ({
															...prev,
															[c.index]: action,
														}))
													}
													className={`px-2 py-1 rounded text-xs border transition-colors ${
														actions[c.index] === action
															? "bg-primary text-primary-foreground border-primary"
															: "border-muted-foreground/30 text-muted-foreground hover:border-primary/60"
													}`}
												>
													{action === "skip"
														? "Pular"
														: action === "keep_both"
															? "Manter 2"
															: "Substituir"}
												</button>
											),
										)}
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
