export type Module = {
    reference: string; // Unique ID
    title: string
    description: string
}

export type BaseQuestion = {
    id: string; // GUID/ULID 
    moduleReference: string;
    questionText: string,
    weighting?: number; // default 1
}

export type BooleanQuestion = BaseQuestion & {
    type: 'boolean';
    noLabel?: string; // default "No"
    yesLabel?: string; // default "Yes"
}

export type ScalerQuestion = BaseQuestion & {
    type: 'scaler';
    minValue: number;
    maxValue: number; // fixed typo from maxValue
    increment: number;
    minLabel?: string; // defaults to String(minValue)
    maxLabel?: string; // defaults to String(maxValue)
}

export type Question = BooleanQuestion | ScalerQuestion