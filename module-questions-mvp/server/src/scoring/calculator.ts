import type {
  Module,
  Question,
  Answer,
  ModuleScore,
} from "../../../shared/types";

export function calculateModuleScore(
  module: Module,
  questions: Question[],
  answers: Answer[]
): ModuleScore {
  // convert answers array to map for quick lookup
  const answerMap = new Map(answers.map((a) => [a.questionId, a.value]));

  // Filter questions for this module
  // So we're taking the entire questions bank with their answers??
  const moduleQuestions = questions.filter(
    (q) => q.moduleReference === module.reference
  );

  let totalScore = 0;
  let maxPossibleScore = 0;
  let answeredCount = 0;

  for (const question of moduleQuestions) {
    const answer = answerMap.get(question.id);

    // skip unanswered questions
    if (answer === undefined) continue;

    answeredCount++;
    const weight = question.weighting || 1;

    // Should Boolean questions be weighted 1,0
    // or should they have a weight depending on the question
    if (question.type === "boolean") {
      const value = answer === true ? 1 : 0;
      totalScore += value * weight;
      maxPossibleScore += weight;
    } else {
      const value = answer as number;
      totalScore += value * weight;
      maxPossibleScore += question.maxValue * weight;
    }
  }

  const percentage =
    maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

  return {
    moduleReference: module.reference,
    moduleTitle: module.title,
    score: Math.round(percentage * 10) / 10, // Round to 1 decimal
    totalScore,
    maxPossibleScore,
    answeredQuestions: answeredCount,
    totalQuestions: moduleQuestions.length,
  };
}

export function calculateAllScores(
  modules: Module[],
  questions: Question[],
  answers: Answer[]
): { scores: ModuleScore[]; rankedModules: string[] } {
  // Calculate score for each module
  const scores = modules.map((module) =>
    calculateModuleScore(module, questions, answers)
  );

  // Sort by score descending (highest first)
  const sorted = [...scores].sort((a, b) => b.score - a.score);

  // Extract ranked module refernces
  const rankedModules = sorted.map((s) => s.moduleReference);

  return { scores, rankedModules };
}
