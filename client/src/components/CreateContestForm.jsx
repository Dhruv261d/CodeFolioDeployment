// client/src/components/CreateContestForm.jsx
import React, { useState } from 'react';
import { auth } from '../firebase.js';

function CreateContestForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setMessage('Error: Not logged in.');
      return;
    }
    
    if (new Date(endTime) <= new Date(startTime)) {
      setMessage('Error: End time must be after start time.');
      return;
    }

    const contestData = { 
      title, 
      description, 
      startTime: new Date(startTime).toISOString(), 
      endTime: new Date(endTime).toISOString() 
    };

    try {
      const idToken = await currentUser.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/contests/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(contestData)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create contest.');
      }
      setMessage(`Success: ${data.message}`);
      setTitle(''); setDescription(''); setStartTime(''); setEndTime('');
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="admin-form">
      <h2>Create New Contest</h2>

      <div className="form-group full-width">
        <label>Contest Title:</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="form-input" />
      </div>

      <div className="form-group full-width">
        <label>Description:</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} required className="form-textarea" />
      </div>

      <div className="form-grid">
        <div className="form-group">
            <label>Start Time:</label>
            <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="form-input" />
        </div>
        <div className="form-group">
            <label>End Time:</label>
            <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className="form-input" />
        </div>
      </div>

      <button type="submit" className="admin-button primary" style={{marginTop: '10px'}}>Create Contest</button>

      {message && <p style={{ marginTop: '20px', fontWeight: 500, color: message.startsWith('Error') ? '#e74c3c' : '#64ffda' }}>{message}</p>}
    </form>
  );
}

export default CreateContestForm;