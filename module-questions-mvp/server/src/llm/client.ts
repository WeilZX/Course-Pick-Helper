import { anthropic, LLM_CONFIG } from "./config.ts";
import type { LLMCallOptions, LLMResponse } from "./types.ts";
import { z } from "zod";

// TODO make a diagram of this function

/**
 * Generic function to call LLM and validate response against schema
 */
export async function callLLM<T>(
  options: LLMCallOptions,
  schema: z.ZodSchema<T>
): Promise<LLMResponse<T>> {
  // Safety check
  if (!LLM_CONFIG.useRealLLM || !anthropic) {
    return {
      data: null,
      error: "LLM is disabled (USE_REAL_LLM=false)",
    };
  }

  try {
    const message = await anthropic.messages.create({
      model: LLM_CONFIG.model,
      max_tokens: options.maxTokens || LLM_CONFIG.maxTokens,
      temperature: options.temperature ?? LLM_CONFIG.temperature,
      system: options.systemPrompt,
      messages: [
        {
          role: "user",
          content: options.prompt,
        },
      ],
    });

    //Extract text from response
    const textContent = message.content.find((c) => c.type === "text");
    if (!textContent || textContent.type === "text") {
      return {
        data: null,
        error: "No text content in LLM response",
      };
    }

    const responseText = textContent.text;

    // try to parse as JSON
    let jsonData;
    try {
      jsonData = JSON.parse(responseText);
    } catch (parseError) {
      // If not valid JSON, try to extract JSON from markdown code blocks
      const jsonMatch = responseText.match(/'''json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonData = JSON.parse(jsonMatch[1]);
      } else {
        return {
          data: null,
          error: `LLM response is not valid JSON: ${responseText}`,
        };
      }
    }

    const validated = schema.safeParse(jsonData);
    if (!validated.success) {
      return {
        data: null,
        error: `LLM response failed validation: ${validated.error.message}`,
      };
    }

    return {
      data: validated.data,
      tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
