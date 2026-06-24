import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, ExtractedTransaction } from "../types";
import {
	EXTRACTION_SYSTEM_PROMPT,
	STATEMENT_EXTRACTION_SYSTEM_PROMPT,
	buildExtractionPrompt,
	buildStatementExtractionPrompt,
} from "../prompt";

export class AnthropicProvider implements LLMProvider {
	name = "anthropic";
	private client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

	async extract(
		pdfText: string,
		documentType?: "fatura" | "extrato",
	): Promise<ExtractedTransaction[]> {
		const isStatement = documentType === "extrato";
		const message = await this.client.messages.create({
			model: "claude-sonnet-4-6",
			max_tokens: 4096,
			system: isStatement
				? STATEMENT_EXTRACTION_SYSTEM_PROMPT
				: EXTRACTION_SYSTEM_PROMPT,
			messages: [
				{
					role: "user",
					content: isStatement
						? buildStatementExtractionPrompt(pdfText)
						: buildExtractionPrompt(pdfText),
				},
			],
		});
		const text = message.content
			.filter((b) => b.type === "text")
			.map((b) => (b as { type: "text"; text: string }).text)
			.join("");
		return JSON.parse(text) as ExtractedTransaction[];
	}
}
