import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import type { Module, Question } from "../../shared/types.ts";

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

// I don't understand the syntax here
// Mock LLM functions - We'll implemnet the real thing later
function parseMarkdownToModule(markdown: string): Module | null {
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

function generateQuestions(modules: Module[]): Question[] {
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

      console.log(`Processing file${i}:`, file); // 🔍 Debug

      if (!(file instanceof File)) {
        issues.push(`file${i}: Invalid file format`);
        continue;
      }

      const text = await file.text();
      console.log(`File ${i} content preview:`, text.substring(0, 100)); // 🔍 Debug

      const module = parseMarkdownToModule(text);
      console.log(`Parsed module ${i}:`, module); // 🔍 Debug

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
    const questions = generateQuestions(moduleValidation.data);
    return c.json({ questions });
  } catch (error) {
    return c.json({ error: "Failed to generate questions" }, 500);
  }
});

// start server
const port = Number(process.env.PORT) || 8787;

// Use Hono's Node.js adapter to create actual HTTP server
import { serve } from "@hono/node-server";

serve({
  fetch: app.fetch,
  port: port,
});

console.log(`Server running on http://localhost:${port}`);
