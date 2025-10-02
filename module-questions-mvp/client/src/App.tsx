import { useState } from 'react';
import type { Module, Question } from '../../shared/types';


export default function App() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);


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
    } catch (error) {
      alert('Failed to generate questions');
      console.error(error);
    } finally {
      // Stop loading - "You're done generating"
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h1>Module Question Generator</h1>

      {/* Step 1: Upload Files */}
      <section style={{ margin: '1rem 0', padding: '1rem', border: '1px solid #ddd', borderRadius: 4 }}>
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
          onClick={uploadModules}
          disabled={isUploading}
          style={{
            marginLeft: 8,
            opacity: isUploading ? 0.6 : 1,
            cursor: isUploading ? 'not-allowed' : 'pointer'
          }}
        >
          {isUploading ? 'Processing with AI...' : 'Upload & Parse'}
        </button>
        {/* ↑ User selects files → clicks button → uploadModules() runs → backend called */}

        {/* TODO consider adding 1 of n file count for files that have been processed */}
        {isUploading && (
          <div style={{ marginTop: 12, color: '#0066cc' }}>
            <strong>AI is analyzing your files...</strong>
            <br />
            <small>This may take 5-10 seconds per file</small>
          </div>
        )}




        {issues.length > 0 && (
          <div style={{ marginTop: 12, padding: 8, backgroundColor: '#fee', color: '#c00' }}>
            <strong>Issues:</strong>
            <ul>{issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul>
          </div>
        )}
      </section>

      {/* Step 2: Edit Modules */}
      {modules.length > 0 && (
        <section style={{ margin: '1rem 0', padding: '1rem', border: '1px solid #ddd', borderRadius: 4 }}>
          <h2>2. Preview & Edit Modules</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ccc' }}>
                <th style={{ textAlign: 'left', padding: 8 }}>Reference</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Title</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {/* Section 2: Edit Table (only shows if modules.length > 0) */}
              {modules.map((module, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 8 }}>
                    <input
                      value={module.reference}
                      // what is e?
                      onChange={e => updateModule(i, 'reference', e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </td>
                  <td style={{ padding: 8 }}>
                    <input
                      value={module.title}
                      onChange={e => updateModule(i, 'title', e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </td>
                  <td style={{ padding: 8 }}>
                    <textarea
                      value={module.description}
                      onChange={e => updateModule(i, 'description', e.target.value)}
                      rows={3}
                      style={{ width: '100%' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={generateQuestions}
            disabled={isGenerating}
            style={{
              marginTop: 12,
              opacity: isGenerating ? 0.6 : 1,
              cursor: isGenerating ? 'not-allowed' : 'pointer'
            }}
          >
            {isGenerating ? 'AI Generating Questions...' : 'Generate Questions'}
          </button>
          
          {isGenerating && (
            <div style={{ marginTop: 12, color: '#0066cc' }}>
              <strong>AI is creating personalized questions...</strong>
              <br/>
              <small>This may take 10-15 seconds</small>
            </div>
          )}
        </section>
      )}

      {/* Step 3: View Questions */}
      {questions.length > 0 && (
        <section style={{ margin: '1rem 0', padding: '1rem', border: '1px solid #ddd', borderRadius: 4 }}>
          <h2>3. Generated Questions</h2>
          <ul>
            {questions.map(q => (
              <li key={q.id} style={{ marginBottom: 12 }}>
                <strong>{q.moduleReference}:</strong> {q.questionText}
                {q.type === 'scalar' && (
                  <span style={{ color: '#666' }}>
                    {' '}[{q.minValue}-{q.maxValue}, step: {q.increment}]
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}