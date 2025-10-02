import { v4 as uuid } from "uuid";
import type { Module, Question } from "../../../shared/types.js";

/**
 * Mock parser - extracts module info using regex
 * Replace this with LLM in production
 */
export function parseMarkdownToModule(markdown: string): Module | null {
  const refMatch = /Reference:\s*(.+)/i.exec(markdown);
  const titleMatch = /Title:\s*(.+)/i.exec(markdown);
  const descMatch = /Description:\s*([\s\S]+)/i.exec(markdown);

  if (!refMatch || !titleMatch || !descMatch) return null;

  return {
    reference: refMatch[1].trim(),
    title: titleMatch[1].trim(),
    description: descMatch[1].trim().slice(0, 400),
  };
}

/**
 * Mock generator - creates template questions
 * Replace this with LLM in production
 */
export function generateQuestions(modules: Module[]): Question[] {
  return modules.flatMap((module) => [
    {
      id: uuid(),
      type: "boolean" as const,
      moduleReference: module.reference,
      questionText: `Do you meet the prerequisites for ${module.title}?`,
      weighting: 1,
      yesLabel: "Yes",
      noLabel: "No",
    },
    {
      id: uuid(),
      type: "scalar" as const,
      moduleReference: module.reference,
      questionText: `How interested are you in ${module.title}?`,
      weighting: 1,
      minValue: 1,
      maxValue: 5,
      increment: 1,
      minLabel: "Low",
      maxLabel: "High",
    },
  ]);
}
