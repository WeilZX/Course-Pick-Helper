/**
 * Prompt templates for LLM operations
 *
 * Prompt engineering tips:
 * - Be explicit about output format
 * - Provide examples
 * - Request JSON only (no markdown, no explanation)
 * - Handle edge cases
 */

/**
 * System prompt for all operations
 * Sets the context for how Claude should behave
 */
export const SYSTEM_PROMPT = `You are a helpful assistant that extracts structured data from academic course descriptions. 
You always respond with valid JSON only, without any markdown formatting or additional explanation.`;

/**
 * Prompt for parsing markdown files into Module objects
 */
export function createModuleParsingPrompt(markdown: string): string {
  return `Extract module information from the following markdown text.

REQUIRED OUTPUT FORMAT (JSON only, no markdown):
{
  "reference": "string (e.g., COMP1234, CS567)",
  "title": "string (course title)",
  "description": "string (course description)"
}

RULES:
- Look for fields labeled "Reference:", "Title:", "Description:" (case-insensitive)
- If any required field is missing, return null
- Description should be the full text after "Description:" label
- Remove extra whitespace but preserve meaningful content
- Return ONLY the JSON object, nothing else

EXAMPLE INPUT:
Reference: COMP1234
Title: Algorithms
Description: Study of algorithms and data structures.

EXAMPLE OUTPUT:
{"reference":"CS123","title":"Algorithms","description":"Study of algorithms and data structures."}
NOW PROCESS THIS INPUT:
${markdown}

Remember: Respond with ONLY the JSON object or null if parsing fails.`;
}

/**
 * Prompt for generating questions from modules
 */
export function createQuestionGenerationPrompt(
  modules: Array<{
    reference: string;
    title: string;
    description: string;
  }>
): string {
  const modulesJson = JSON.stringify(modules, null, 2);

  return `Generate survey questions for these academic modules to help students choose which courses to take.

MODULES:
${modulesJson}

REQUIREMENTS:
Generate 3-4 questions per module with a mix of:
1. Boolean questions (yes/no) - for prerequisites, requirements, background checks
2. Scalar questions (1-5 scale) - for interest level, difficulty perception, time commitment

REQUIRED OUTPUT FORMAT (JSON array only, no markdown):
[
  {
    "id": "unique-string-id",
    "type": "boolean",
    "moduleReference": "COMP1234",
    "questionText": "Clear, specific question text?",
    "weighting": 1,
    "yesLabel": "Yes",
    "noLabel": "No"
  },
  {
    "id": "unique-string-id",
    "type": "scalar",
    "moduleReference": "COMP1234",
    "questionText": "Clear, specific question text?",
    "weighting": 1,
    "minValue": 1,
    "maxValue": 5,
    "increment": 1,
    "minLabel": "Low/None",
    "maxLabel": "High/Strong"
  }
]

QUESTION DESIGN GUIDELINES:
- Boolean questions should check prerequisites, prior experience, or yes/no factors
- Scalar questions should measure interest, confidence, time availability, difficulty perception
- Weight important questions higher (1.5-2.0), less critical ones lower (0.5-0.75)
- Make questions specific to each module's content
- Use clear, student-friendly language
- Each question should help determine if the module is a good fit

EXAMPLE GOOD QUESTIONS:
Boolean: "Do you have prior experience with ${
    modules[0]?.title || "programming"
  }?"
Boolean: "Are you comfortable with the mathematical prerequisites?"
Scalar: "How interested are you in ${
    modules[0]?.title || "this topic"
  }?" (1=Not interested, 5=Very interested)
Scalar: "How would you rate your current skill level in this area?" (1=Beginner, 5=Advanced)

Generate creative, relevant questions based on each module's description. Return ONLY the JSON array.`;
}

/**
 * Token budget considerations:
 * - Module parsing: Small prompts, ~200-500 tokens per call
 * - Question generation: Larger, ~1000-2000 tokens per call
 * - Budget accordingly for API costs
 */
