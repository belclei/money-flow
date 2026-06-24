import OpenAI from "openai";
import type { LLMProvider, ExtractedTransaction } from "../types";
import {
	EXTRACTION_SYSTEM_PROMPT,
	STATEMENT_EXTRACTION_SYSTEM_PROMPT,
	buildExtractionPrompt,
	buildStatementExtractionPrompt,
} from "../prompt";

export class OpenAIProvider implements LLMProvider {
	name = "openai";
	private client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

	async extract(
		pdfText: string,
		documentType?: "fatura" | "extrato",
	): Promise<ExtractedTransaction[]> {
		const isStatement = documentType === "extrato";
		const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
		const response = await this.client.chat.completions.create({
			model,
			response_format: { type: "json_object" },
			messages: [
				{
					role: "system",
					content: isStatement
						? STATEMENT_EXTRACTION_SYSTEM_PROMPT
						: EXTRACTION_SYSTEM_PROMPT,
				},
				{
					role: "user",
					content: isStatement
						? buildStatementExtractionPrompt(pdfText)
						: buildExtractionPrompt(pdfText),
				},
			],
		});
		const raw = response.choices[0]?.message.content ?? "{}";
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : (parsed.transactions ?? []);
	}
}
