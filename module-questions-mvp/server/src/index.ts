import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import type { Module, Question } from "../../shared/types.ts";
import { calculateAllScores } from "./scoring/calculator.ts";

// Both Mock and LLM functions
import {
  parseMarkdownToModule as parseMarkdownMock,
  generateQuestions as generateQuestionsMock,
} from "./mock/generators.js";
import {
  parseMarkdownToModuleLLM,
  generateQuestionsLLM,
} from "./llm/endpoints.js";

import "./llm/config.js"; // Load LLM config on startup

// The backend and cors?
const app = new Hono();
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173"], // Vite dev server
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    allowHeaders: ["Content-Type"],
  })
);

// We made a database scheme here???
// oh we did make the schema, but we didn't make the database

const ModuleSchema = z.object({
  reference: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
});

// TODO MAJOR: The idea here is we upload a pdf/md file, then parse it into three sections?
// Is that our big picture goal?

// File upload endpoint
app.post("/upload/modules", async (c) => {
  try {
    const body = await c.req.parseBody();

    const fileCount = parseInt(body.fileCount as string) || 0;

    const modules: Module[] = [];
    const issues: string[] = [];
    const seen = new Set<string>();

    // Iterate through indexed files
    for (let i = 0; i < fileCount; i++) {
      const file = body[`file${i}`];

      // console.log(`Processing file${i}:`, file); // Debug

      if (!(file instanceof File)) {
        issues.push(`file${i}: Invalid file format`);
        continue;
      }

      const text = await file.text();
      // console.log(`File ${i} content preview:`, text.substring(0, 100)); // Debug

      // Try LLM first, fallback to mock
      let module = await parseMarkdownToModuleLLM(text);
      if (!module) {
        module = parseMarkdownMock(text); // Fallback to regex parser
      }
      // console.log(`Parsed module ${i}:`, module); // Debug

      if (!module) {
        issues.push(
          `${file.name}: Could not parse (expect Reference/Title/Description)`
        );
        continue;
      }

      if (seen.has(module.reference)) {
        issues.push(`${file.name}: Duplicate reference ${module.reference}`);
        continue;
      }

      const validation = ModuleSchema.safeParse(module);
      if (!validation.success) {
        issues.push(`${file.name}: Invalid module data`);
        continue;
      }

      seen.add(module.reference);
      modules.push(validation.data);
    }

    return c.json({ modules, issues });
  } catch (error) {
    console.error("Upload error:", error);
    return c.json({ error: "Failed to process files" }, 500);
  }
});

app.post("/upload/questions", async (c) => {
  try {
    const { modules } = await c.req.json();

    // Validate modules array
    const moduleValidation = z.array(ModuleSchema).safeParse(modules);
    if (!moduleValidation.success) {
      return c.json({ error: "Invalid modules data" }, 400);
    }
    // Try LLM first, fallback to mock
    let questions = await generateQuestionsLLM(moduleValidation.data);
    if (questions.length === 0) {
      questions = generateQuestionsMock(moduleValidation.data); // Fallback
    }
    return c.json({ questions });
  } catch (error) {
    return c.json({ error: "Failed to generate questions" }, 500);
  }
});

// What is c and why are we req,json()?
app.post("/upload/calculate-scores", async (c) => {
  try {
    const body = await c.req.json();
    console.log("Received scoring request:", {
      modulesCount: body.modules?.length,
      questionsCount: body.questions?.length,
      answersCount: body.answers?.length,
    });

    const { modules, questions, answers } = body;

    // Validate input
    const modulesValidation = z.array(ModuleSchema).safeParse(modules);
    if (!modulesValidation.success) {
      console.error("Module validation failed:", modulesValidation.error);
      return c.json({ error: "Invalid modules data" }, 400);
    }

    if (!Array.isArray(questions)) {
      console.error("Questions is not an array:", typeof questions);
      return c.json({ error: "Questions must be an array" }, 400);
    }

    if (!Array.isArray(answers)) {
      console.error("Answers is not an array:", typeof answers);
      return c.json({ error: "Answers must be an array" }, 400);
    }

    console.log("Calling calculateAllScores...");
    const result = calculateAllScores(
      modulesValidation.data,
      questions,
      answers
    );

    console.log("Scoring successful:", result);
    return c.json(result);
  } catch (error) {
    console.error("Scoring error details:", error);
    return c.json(
      {
        error: "Failed to calculate scores",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

// ALL ENDPOINTS MUST WRITTEN BEFORE THE SERVER STARTS
// start server
const port = Number(process.env.PORT) || 8787;

// Use Hono's Node.js adapter to create actual HTTP server
import { serve } from "@hono/node-server";
// import Module from "module";

serve({
  fetch: app.fetch,
  port: port,
});

console.log(`Server running on http://localhost:${port}`);
