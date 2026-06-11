export interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  category?: string;
}

export interface LLMProvider {
  name: string;
  extract(pdfText: string): Promise<ExtractedTransaction[]>;
}
