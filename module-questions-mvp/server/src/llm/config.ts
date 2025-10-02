// Anthropic setup, model selection, API key loading

import Anthropic from "@anthropic-ai/sdk";
import { config } from "dotenv";

// load environment variables
config();

// Environment variables with defaults
export const LLM_CONFIG = {
  apikey: process.env.ANTHROPIC_API_KEY || "",
  model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
  useRealLLM: process.env.USE_REAL_LLM === "true",
  maxTokens: 4096,
  temperature: 0.7, // 0 = deterministic, 1 = creative
};

// Validate configuration
if (LLM_CONFIG.useRealLLM && !LLM_CONFIG.apikey) {
  console.error("ANTHROPIC_API_KEY is required when USE_REAL_LLM=true");
  console.error("Set it in your .env file or disable real LLM");
  process.exit(1);
}

// Initialize Anthropic client (Only if using real LLM)
export const anthropic = LLM_CONFIG.useRealLLM
  ? new Anthropic({ apiKey: LLM_CONFIG.apikey })
  : null;

// Log configuration on startup
console.log("LLM Configuration:");
console.log(`   Mode: ${LLM_CONFIG.useRealLLM ? "Real LLM" : "Mock"}`);
console.log(`   Model: ${LLM_CONFIG.model}`);
if (LLM_CONFIG.useRealLLM) {
  console.log(`   API key: ${LLM_CONFIG.apikey.slice(0, 10)}...`);
}
