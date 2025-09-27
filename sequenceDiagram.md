sequenceDiagram
    autonumber
    actor U as User
    participant C as Web App (Client)
    participant S as Server API
    participant PAE as prompt-as-endpoint<br/>(type-safe LLM handler)
    participant L as LLM Provider
    participant ST as Storage (Object Store/DB)

    %% --- Flow A: Upload & Parse Modules ---
    U->>C: Select & upload module_*.md files
    C->>S: POST /upload/modules (multipart .md files)
    note over S: Validate files, enforce size/type limits

    S->>ST: (Optional) Persist raw files / temp blobs
    S->>PAE: parseModules({ filesText[] })<br/>// strongly-typed handler
    PAE->>L: Prompt: "Parse these .mds → Module[]"<br/>+ schema constraints
    L-->>PAE: Parsed JSON (candidate Module[])
    PAE-->>S: Module[] (validated/coerced)
    alt dedupe / integrity
      S->>S: Deduplicate by Module.reference, validate title/description
      S->>S: Report per-file errors/warnings
    end
    S-->>C: 200 OK { modules: Module[], issues[] }
    C->>U: Preview UI: editable Module[]

    %% --- User Edits ---
    U->>C: Edit fields (fix titles, references, descriptions)
    C->>C: Client-side schema validation (zod/type guards)
    U->>C: Confirm "Generate questions"

    %% --- Flow B: Generate Questions from (Edited) Modules ---
    C->>S: POST /upload/questions { modules: Module[] }
    S->>S: Validate schema & uniqueness of Module.reference
    S->>PAE: generateQuestions({ modules })
    PAE->>L: Prompt: "For each Module → Question[]"<br/>include BaseQuestion rules
    L-->>PAE: JSON (candidate Question[])
    PAE-->>S: Question[] (schema-validated)
    S->>S: Post-process (defaults, weights, ids)
    S-->>C: 200 OK { questions: Question[] }
    C->>U: Render Question[] (boolean/scalar UIs)

    %% --- Optional Persistence & Audit ---
    opt persist outcomes
      S->>ST: Save Module[] & Question[] with trace ids
      S-->>C: traceId for reproducibility
    end

    %% --- Error/Retry Paths ---
    opt LLM/schema error
      PAE-->>S: ValidationError (which module failed, why)
      S-->>C: 422 UnprocessableEntity { fieldErrors, rawText? }
      C->>U: Show inline errors; allow edit/retry
    end
