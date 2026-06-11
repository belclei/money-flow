import OpenAI from "openai";
import type { LLMProvider, ExtractedTransaction } from "../types";
import {
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionPrompt,
  cleanJsonResponse,
} from "../prompt";

export class OllamaProvider implements LLMProvider {
  name = "ollama";
  private client = new OpenAI({
    baseURL: `${process.env.OLLAMA_BASE_URL ?? "http://localhost:11434"}/v1`,
    apiKey: "ollama",
  });

  async extract(pdfText: string): Promise<ExtractedTransaction[]> {
    const model = process.env.OLLAMA_MODEL ?? "llama3.2";
    const response = await this.client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: buildExtractionPrompt(pdfText) },
      ],
    });
    const raw = response.choices[0]?.message.content ?? "[]";
    return JSON.parse(cleanJsonResponse(raw)) as ExtractedTransaction[];
  }
}
