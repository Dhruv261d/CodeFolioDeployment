// client/src/components/AddProblemForm.jsx
import React, { useState } from 'react';
import { auth } from '../firebase.js'; // Use the central Firebase auth instance

function AddProblemForm({ contestId, onProblemAdded }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('Easy');
  const [points, setPoints] = useState(100);
  const [constraints, setConstraints] = useState('');
  const [sampleInput, setSampleInput] = useState('');
  const [sampleOutput, setSampleOutput] = useState('');
  const [hiddenTestCases, setHiddenTestCases] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    const testCases = hiddenTestCases.split('---').map(tc => {
        const [input, output] = tc.split(':::');
        return { input: input?.trim(), output: output?.trim() };
    }).filter(tc => tc.input && tc.output);

    if (testCases.length === 0) {
        setMessage('Error: Please provide hidden test cases in the correct format.');
        return;
    }

    const problemData = {
      contestId,
      title,
      description,
      difficulty,
      points: Number(points),
      constraints,
      sampleInput,
      sampleOutput,
      testCases
    };

    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/problems/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify(problemData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add problem.');
      }
      
      setMessage(`Success: ${data.message}`);
      // Clear form
      setTitle(''); setDescription(''); setConstraints('');
      setPoints(100); setSampleInput(''); setSampleOutput(''); setHiddenTestCases('');
      
      if (onProblemAdded) onProblemAdded();

    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="admin-form">
      <h2>Add New Problem</h2>
      
      <div className="form-group full-width">
        <label>Title:</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="form-input" />
      </div>

      <div className="form-grid">
        <div className="form-group">
            <label>Description (Markdown supported):</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows="8" className="form-textarea" />
        </div>
        <div className="form-group">
            <label>Constraints:</label>
            <textarea value={constraints} onChange={(e) => setConstraints(e.target.value)} required rows="8" className="form-textarea" />
        </div>
        <div className="form-group">
            <label>Difficulty:</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} required className="form-select">
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
            </select>
        </div>
        <div className="form-group">
            <label>Points:</label>
            <input type="number" value={points} onChange={(e) => setPoints(e.target.value)} required min="1" className="form-input" />
        </div>
        <div className="form-group">
            <label>Sample Input:</label>
            <textarea value={sampleInput} onChange={(e) => setSampleInput(e.target.value)} required rows="6" className="form-textarea" />
        </div>
        <div className="form-group">
            <label>Sample Output:</label>
            <textarea value={sampleOutput} onChange={(e) => setSampleOutput(e.target.value)} required rows="6" className="form-textarea" />
        </div>
      </div>
      
       <div className="form-group full-width">
        <label>Hidden Test Cases:</label>
        <p style={{fontSize: '0.8em', color: '#8892b0', margin: '0 0 8px 0'}}>Format: `input:::output` for each case, separated by `---` on a new line.</p>
        <textarea 
            value={hiddenTestCases} 
            onChange={(e) => setHiddenTestCases(e.target.value)} 
            required 
            rows="10" 
            className="form-textarea" 
            placeholder={"5 10:::15\n---\n-2 3:::1"}
        />
      </div>

      <button type="submit" className="admin-button primary" style={{marginTop: '10px'}}>Add Problem</button>
      
      {message && <p style={{ marginTop: '20px', fontWeight: 500, color: message.startsWith('Error') ? '#e74c3c' : '#64ffda' }}>{message}</p>}
    </form>
  );
}

export default AddProblemForm;