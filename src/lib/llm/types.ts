export interface ExtractedTransaction {
	date: string;
	description: string;
	amount: number;
	currency?: string;
	amountBRL?: number;
	category?: string;
	cardHolder?: string;
	installmentNumber?: number;
	installmentTotal?: number;
	installmentDescription?: string;
}

export interface LLMProvider {
	name: string;
	extract(
		pdfText: string,
		documentType?: "fatura" | "extrato",
	): Promise<ExtractedTransaction[]>;
}
