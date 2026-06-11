import OpenAI from "openai";
import type { LLMProvider, ExtractedTransaction } from "../types";
import {
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionPrompt,
  cleanJsonResponse,
} from "../prompt";

export class DeepSeekProvider implements LLMProvider {
  name = "deepseek";
  private client = new OpenAI({
    baseURL: "https://api.deepseek.com/v1",
    apiKey: process.env.DEEPSEEK_API_KEY,
  });

  async extract(pdfText: string): Promise<ExtractedTransaction[]> {
    const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
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
