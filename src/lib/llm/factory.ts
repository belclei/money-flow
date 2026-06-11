import type { LLMProvider } from "./types";

export async function getLLMProvider(): Promise<LLMProvider> {
  const provider = process.env.LLM_PROVIDER ?? "deepseek";

  switch (provider) {
    case "deepseek": {
      const { DeepSeekProvider } = await import("./providers/deepseek");
      return new DeepSeekProvider();
    }
    case "anthropic": {
      const { AnthropicProvider } = await import("./providers/anthropic");
      return new AnthropicProvider();
    }
    case "openai": {
      const { OpenAIProvider } = await import("./providers/openai");
      return new OpenAIProvider();
    }
    case "ollama": {
      const { OllamaProvider } = await import("./providers/ollama");
      return new OllamaProvider();
    }
    case "openai-compatible": {
      const { OpenAICompatibleProvider } = await import(
        "./providers/openai-compatible"
      );
      return new OpenAICompatibleProvider();
    }
    default:
      throw new Error(`Unknown LLM_PROVIDER: "${provider}"`);
  }
}
