import { useMemo, useState } from 'react';
import type { Module, Question, Answer, ModuleScore } from '../../shared/types';
import './App.css'; 



export default function App() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [modules, setModules] = useState<Module[]>([]);

  const [issues, setIssues] = useState<string[]>([]);

  const [questions, setQuestions] = useState<Question[]>([]);

  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [answers, setAnswers] = useState<Map<string, Answer['value']>>(new Map());

  const [scores, setScores] = useState<ModuleScore[]>([]);
  const [rankedModules, setRankedModules] = useState<string[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);



  // Group questions by module reference
  const questionsByModule = useMemo(() => {
    const grouped = new Map<string, Question[]>();
    questions.forEach(q => {
      const existing = grouped.get(q.moduleReference) || [];
      grouped.set(q.moduleReference, [...existing, q]);
    });
    return grouped;
  }, [questions]);

  // Check if all questions are answered
  const allAnswered = useMemo(() => {
    return questions.length > 0 && questions.every(q => answers.has(q.id));
  }, [questions, answers]);

  // Helper to update answer
  const setAnswer = (questionId: string, value: boolean | number) => {
    setAnswers(prev => new Map(prev).set(questionId, value));
  };



  const uploadModules = async () => {
    if (!files || files.length === 0) {
      alert('Please select files first');
      return;
    }

    // start loading
    setIsUploading(true);

    // Take files from state
    // This opens the file select window!
    const formData = new FormData();
    Array.from(files).forEach((file, index) => {
      formData.append(`file${index}`, file);
    });

    formData.append('fileCount', String(files.length));

    // Post/Send commands always need to be in a try/except 
    try {

      // Send to Backend via.... which address?
      const response = await fetch('/upload/modules', {
        method: 'POST',
        body: formData
      });
      // Receive from backend
      const data = await response.json();
      setModules(data.modules || []);
      setIssues(data.issues || []);
      setQuestions([]);
      setAnswers(new Map()) // Clear previous answers - will be removed when data persistence is implemented
    } catch (error) {
      alert('Failed to upload files');
      console.error(error);
    } finally {
      // Finish/stop loading
      setIsUploading(false);
    }
  };

  // Confusing syntax
  // TODO how does this work?
  const updateModule = (index: number, field: keyof Module, value: string) => {
    setModules(prev => prev.map((module, i) =>
      i === index ? { ...module, [field]: value } : module
    ));
  };

  const generateQuestions = async () => {

    // Start loading - "Now you're working on generating the questions"
    setIsGenerating(true);

    try {
      // Send to backend
      const response = await fetch('/upload/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules }) // Sends edited modules
      });
      // Receive from backend
      const data = await response.json();
      setQuestions(data.questions || []);
      setAnswers(new Map()); // clear previous answers when regenerating
    } catch (error) {
      alert('Failed to generate questions');
      console.error(error);
    } finally {
      // Stop loading - "You're done generating"
      setIsGenerating(false);
    }
  };


  // Add this function after generateQuestions:
  const calculateScores = async () => {
    setIsCalculating(true);

    try {
      // Convert Map to array of Answer objects
      const answersArray = Array.from(answers.entries()).map(([questionId, value]) => ({
        questionId,
        value
      }));

      const response = await fetch('/upload/calculate-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modules,
          questions,
          answers: answersArray
        })
      });

      const data = await response.json();
      setScores(data.scores || []);
      setRankedModules(data.rankedModules || []);
    } catch (error) {
      alert('Failed to calculate scores');
      console.error(error);
    } finally {
      setIsCalculating(false);
    }
  };
  return (
    <div className='app-container'>
      <h1>Module Question Generator</h1>

      {/* Step 1: Upload Files */}
      <section className='section'>
        <h2>1. Upload Module Files (.md)</h2>
        <input
          type="file"
          multiple
          accept=".md,text/markdown"
          onChange={e => setFiles(e.target.files)}
          disabled={isUploading}
        />
        {/* File upload happens here*/}
        <button
          className='button button-spacing'
          onClick={uploadModules}
          disabled={isUploading}
        >
          {isUploading ? 'Processing with AI...' : 'Upload & Parse'}
        </button>
        {/* ↑ User selects files → clicks button → uploadModules() runs → backend called */}

        {/* TODO consider adding 1 of n file count for files that have been processed */}
        {isUploading && (
          <div className='loading-message'>
            <strong>AI is analyzing your files...</strong>
            <br />
            <small>This may take 5-10 seconds per file</small>
          </div>
        )}




        {issues.length > 0 && (
          <div className='issues-box'>
            <strong>Issues:</strong>
            <ul>{issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul>
          </div>
        )}
      </section>


      {/* Step 2: Edit Modules */}
      {modules.length > 0 && (
        <section className="section">
          <h2>2. Preview & Edit Modules</h2>
          <table className="module-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Title</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((module, i) => (
                <tr key={i}>
                  <td>
                    <input
                      value={module.reference}
                      onChange={e => updateModule(i, 'reference', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      value={module.title}
                      onChange={e => updateModule(i, 'title', e.target.value)}
                    />
                  </td>
                  <td>
                    <textarea
                      value={module.description}
                      onChange={e => updateModule(i, 'description', e.target.value)}
                      rows={3}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            className="button button-top-spacing"
            onClick={generateQuestions}
            disabled={isGenerating}
          >
            {isGenerating ? 'AI Generating Questions...' : 'Generate Questions'}
          </button>

          {isGenerating && (
            <div className="loading-message">
              <strong>AI is creating personalized questions...</strong>
              <small>This may take 10-15 seconds</small>
            </div>
          )}
        </section>
      )}

      {/* Step 3: Answer Questions */}
      {questions.length > 0 && (
        <section className="section">
          <h2>3. Answer Questions</h2>
          <p className="progress-text">
            Answer the following questions to help determine which modules best fit your needs.
          </p>
          <p>
            Progress: {answers.size} / {questions.length} answered
          </p>

          {modules.map(module => {
            const moduleQuestions = questionsByModule.get(module.reference) || [];
            if (moduleQuestions.length === 0) return null;

            return (
              <div key={module.reference} className="module-card">
                <h3>{module.reference}: {module.title}</h3>
                <p className="module-card-description">
                  {module.description.substring(0, 150)}
                  {module.description.length > 150 ? '...' : ''}
                </p>

                {moduleQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className={`question-card ${answers.has(q.id) ? 'answered' : ''}`}
                  >
                    <label className="question-label">
                      {idx + 1}. {q.questionText}
                      {q.weighting && q.weighting !== 1 && (
                        <span className="question-weight">
                          (weight: {q.weighting}×)
                        </span>
                      )}
                    </label>

                    {q.type === 'boolean' ? (
                      <div className="boolean-options">
                        <label>
                          <input
                            type="radio"
                            name={q.id}
                            checked={answers.get(q.id) === true}
                            onChange={() => setAnswer(q.id, true)}
                          />
                          {' '}{q.yesLabel || 'Yes'}
                        </label>
                        <label>
                          <input
                            type="radio"
                            name={q.id}
                            checked={answers.get(q.id) === false}
                            onChange={() => setAnswer(q.id, false)}
                          />
                          {' '}{q.noLabel || 'No'}
                        </label>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="range"
                          className="scalar-slider"
                          min={q.minValue}
                          max={q.maxValue}
                          step={q.increment}
                          value={answers.get(q.id) as number ?? q.minValue}
                          onChange={(e) => setAnswer(q.id, Number(e.target.value))}
                        />
                        <div className="scalar-labels">
                          <span>{q.minLabel || q.minValue}</span>
                          <span className="scalar-value">
                            {answers.get(q.id) ?? q.minValue}
                          </span>
                          <span>{q.maxLabel || q.maxValue}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}

          {allAnswered && (
            <button
              className="button button-primary"
              onClick={calculateScores}
              disabled={isCalculating}
            >
              {isCalculating ? 'Calculating Scores...' : 'Calculate Module Rankings'}
            </button>
          )}
        </section>
      )}

      {/* Step 4: Results */}
      {scores.length > 0 && (
        <section className="section">
          <h2>4. Module Rankings</h2>
          <p className="progress-text">
            Based on your answers, here are the modules ranked by fit:
          </p>

          <div>
            {rankedModules.map((moduleRef, index) => {
              const score = scores.find(s => s.moduleReference === moduleRef);
              const module = modules.find(m => m.reference === moduleRef);

              if (!score || !module) return null;

              const rank = index + 1;

              return (
                <div
                  key={moduleRef}
                  style={{
                    marginBottom: '1rem',
                    padding: '1rem',
                    border: '2px solid #ddd',
                    borderRadius: 4,
                    backgroundColor: rank <= 3 ? '#f0f8ff' : 'white',
                    borderColor: rank === 1 ? '#4CAF50' : '#ddd'
                  }}
                >
                  <div className='results-header'>
                    <div className='result-info'>
                      <h3>
                        #{rank} - {module.reference}: {module.title}
                      </h3>
                      <p className='result-description'>
                        {module.description.substring(0, 120)}
                        {module.description.length > 120 ? '...' : ''}
                      </p>
                    </div>
                    <div className='result-score'>
                      <div className='score-percentage'>
                        {score.score}%
                      </div>
                      <div className='score-details'>
                        {score.answeredQuestions}/{score.totalQuestions} questions
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

    </div>
  )
};