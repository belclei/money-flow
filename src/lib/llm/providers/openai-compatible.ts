import OpenAI from "openai";
import type { LLMProvider, ExtractedTransaction } from "../types";
import {
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionPrompt,
  cleanJsonResponse,
} from "../prompt";

export class OpenAICompatibleProvider implements LLMProvider {
  name = "openai-compatible";
  private client = new OpenAI({
    baseURL: process.env.OPENAI_COMPAT_URL,
    apiKey: process.env.OPENAI_COMPAT_KEY ?? "none",
  });

  async extract(pdfText: string): Promise<ExtractedTransaction[]> {
    const model = process.env.OPENAI_COMPAT_MODEL ?? "default";
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
