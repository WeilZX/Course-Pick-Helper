
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
  type: 'boolean';
  noLabel?: string; // default "No"
  yesLabel?: string; // default "Yes"
};

export type ScalarQuestion = BaseQuestion & {
  type: 'scalar';
  minValue: number;
  maxValue: number; 
  increment: number;
  minLabel?: string; // defaults to String(minValue)
  maxLabel?: string; // defaults to String(maxValue)
};

export type Question = BooleanQuestion | ScalarQuestion;