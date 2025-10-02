import { z } from "zod";

/**
 * Generic LLM call options
 */

export interface LLMCallOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}
/**
 * Generic LLM response
 */

export interface LLMResponse<T> {
  data: T | null;
  error?: string;
  tokensUsed?: number;
}
