import OpenAI from "openai";
import type { LLMProvider, ExtractedTransaction } from "../types";
import {
	EXTRACTION_SYSTEM_PROMPT,
	STATEMENT_EXTRACTION_SYSTEM_PROMPT,
	buildExtractionPrompt,
	buildStatementExtractionPrompt,
	cleanJsonResponse,
} from "../prompt";

export class OllamaProvider implements LLMProvider {
	name = "ollama";
	private client = new OpenAI({
		baseURL: `${process.env.OLLAMA_BASE_URL ?? "http://localhost:11434"}/v1`,
		apiKey: "ollama",
	});

	async extract(
		pdfText: string,
		documentType?: "fatura" | "extrato",
	): Promise<ExtractedTransaction[]> {
		const isStatement = documentType === "extrato";
		const model = process.env.OLLAMA_MODEL ?? "llama3.2";
		const response = await this.client.chat.completions.create({
			model,
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
		const raw = response.choices[0]?.message.content ?? "[]";
		return JSON.parse(cleanJsonResponse(raw)) as ExtractedTransaction[];
	}
}
