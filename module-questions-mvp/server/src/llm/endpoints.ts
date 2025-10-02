// prompt-as-endpoint wrapper functions
export async function parseModulesWithLLM(markdown: string): Promise<Module | null>
export async function generateQuestionsWithLLM(modules: Module[]): Promise<Question[]>