import OpenAI from "openai";
import type { LLMProvider, ExtractedTransaction } from "../types";
import {
	EXTRACTION_SYSTEM_PROMPT,
	STATEMENT_EXTRACTION_SYSTEM_PROMPT,
	buildExtractionPrompt,
	buildStatementExtractionPrompt,
	cleanJsonResponse,
} from "../prompt";

export class DeepSeekProvider implements LLMProvider {
	name = "deepseek";
	private client = new OpenAI({
		baseURL: "https://api.deepseek.com/v1",
		apiKey: process.env.DEEPSEEK_API_KEY,
	});

	async extract(
		pdfText: string,
		documentType?: "fatura" | "extrato",
	): Promise<ExtractedTransaction[]> {
		const isStatement = documentType === "extrato";
		const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
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
