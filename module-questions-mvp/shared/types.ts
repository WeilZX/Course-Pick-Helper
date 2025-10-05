export type Module = {
  reference: string; // COMP1234
  title: string;
  description: string;
};

export type BaseQuestion = {
  id: string;
  moduleReference: string;
  questionText: string;
  weighting?: number; // default 1
};

export type BooleanQuestion = BaseQuestion & {
  type: "boolean";
  noLabel?: string; // default "No"
  yesLabel?: string; // default "Yes"
};

export type ScalarQuestion = BaseQuestion & {
  type: "scalar";
  minValue: number;
  maxValue: number;
  increment: number;
  minLabel?: string; // defaults to String(minValue)
  maxLabel?: string; // defaults to String(maxValue)
};

export type Answer = {
  questionId: string;
  value: boolean | number; // boolean for yes/no, number for scalar
};

export type AnswerSubmission = {
  moduleReference: string;
  answers: Answer[];
};

export type ModuleScore = {
  moduleReference: string;
  moduleTitle: string;
  score: number; // 0-100 percentage (because scores are weighted sums)
  totalScore: number; //raw weighted sum
  maxPossibleScore: number; // max possible weighted sum
  answeredQuestions: number;
  totalQuestions: number;
};

export type ScoringRequest = {
  modules: Module[];
  questions: Question[];
  answers: Answer[];
};

export type ScoringResponse = {
  scores: ModuleScore[];
  rankedModules: string[]; // array of module references in rank
};

export type Question = BooleanQuestion | ScalarQuestion;
