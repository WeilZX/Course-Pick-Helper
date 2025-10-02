import { v4 as uuid } from "uuid";
import { z } from "zod";
import type {
  Module,
  Question,
  BooleanQuestion,
  ScalarQuestion,
} from "../../../shared/types.js";
import { callLLM } from "./client.js";
import { LLM_CONFIG } from "./config.js";
import {
  SYSTEM_PROMPT,
  createModuleParsingPrompt,
  createQuestionGenerationPrompt,
} from "./prompts.js";

const ModuleSchema = z.object({
  reference: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
});

// JSON Schema validation!

const BooleanQuestionSchema = z.object({
  id: z.string(),
  type: z.literal("boolean"),
  moduleReference: z.string(),
  questionText: z.string(),
  weighting: z.number().optional(),
  yesLabel: z.string().optional(),
  noLabel: z.string().optional(),
});

const ScalarQuestionSchema = z.object({
  id: z.string(),
  type: z.literal("scalar"),
  moduleReference: z.string(),
  questionText: z.string(),
  weighting: z.number().optional(),
  minValue: z.number(),
  maxValue: z.number(),
  increment: z.number(),
  minLabel: z.string().optional(),
  maxLabel: z.string().optional(),
});

const QuestionSchema = z.union([BooleanQuestionSchema, ScalarQuestionSchema]);

/**
 * Parse markdown text into a Module object using LLM
 * Falls back to null if LLM is disabled or parsing fails
 */
export async function parseMarkdownToModuleLLM(
  markdown: string
): Promise<Module | null> {
  // Check if LLM is enabled
  if (!LLM_CONFIG.useRealLLM) {
    return null;
  }

  const prompt = createModuleParsingPrompt(markdown);

  const response = await callLLM(
    {
      prompt,
      systemPrompt: SYSTEM_PROMPT,
      temperature: 0.3, // Low temperatur for consistent extraction
      maxTokens: 500, // Small response
    },
    ModuleSchema.nullable()
  );

  if (response.error) {
    console.error("LLM parsing error:", response.error);
    return null;
  }

  return response.data;
}

/**
 * Generate questions for modules using LLM
 * Returns array of questions or empty array on failure
 */
export async function generateQuestionsLLM(
  modules: Module[]
): Promise<Question[]> {
  // Check if LLM enabled
  if (!LLM_CONFIG.useRealLLM) {
    return [];
  }

  const prompt = createQuestionGenerationPrompt(modules);

  const response = await callLLM(
    {
      prompt,
      systemPrompt: SYSTEM_PROMPT,
      temperature: 0.7, // Creative questions
      maxTokens: 3000, // Larger response expected
    },
    z.array(QuestionSchema)
  );

  if (response.error) {
    console.error("LLM question generation error:", response.error);
    return [];
  }

  // Ensure all question have IDs (generate if missing)
  const questions = response.data || [];
  return questions.map((q) => ({
    ...q,
    id: q.id || uuid(),
    weighting: q.weighting ?? 1,
  }));
}
