// client/src/components/LiveSessionsAdmin.jsx
import React, { useState } from 'react';
import { auth } from '../firebase.js';

function LiveSessionsAdmin() {
    const [title, setTitle] = useState('');
    const [meetingLink, setMeetingLink] = useState('');
    const [message, setMessage] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage('');
        try {
            if (!auth.currentUser) throw new Error('Authentication error.');
            const idToken = await auth.currentUser.getIdToken();
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sessions/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({ title, meetingLink, startTime, endTime }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to create session.');
            }
            setMessage(`Success: ${data.message}`);
            setTitle('');
            setMeetingLink('');
            setStartTime(''); // Clear time fields on success
            setEndTime(''); // Clear time fields on success
        } catch (error) {
            setMessage(`Error: ${error.message}`);
        }
    };

    return (
        // Apply the main form container styling
        <form onSubmit={handleSubmit} className="admin-form">
            <h2>Create New Live Session</h2>
            
            {/* Use .form-grid and .full-width for a clean, full-width layout */}
            <div className="form-grid"> 
                {/* Session Title */}
                <div className="form-group full-width">
                    <label>Session Title:</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="form-input" // Apply input styling
                    />
                </div>
                
                {/* Meeting Link */}
                <div className="form-group full-width">
                    <label>Meeting Link (e.g., Google Meet or Zoom):</label>
                    <input
                        type="url"
                        value={meetingLink}
                        onChange={(e) => setMeetingLink(e.target.value)}
                        required
                        placeholder="https://meet.google.com/..."
                        className="form-input" // Apply input styling
                    />
                </div>

                {/* Start Time */}
                <div className="form-group"> {/* Two columns for time fields */}
                    <label>Start Time:</label>
                    <input
                        type="datetime-local"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                        className="form-input" // Apply input styling
                    />
                </div>

                {/* End Time */}
                <div className="form-group"> {/* Two columns for time fields */}
                    <label>End Time:</label>
                    <input
                        type="datetime-local"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        required
                        className="form-input" // Apply input styling
                    />
                </div>
            </div>

            {/* Submit Button */}
            <button 
                type="submit" 
                className="admin-button primary" // Apply primary button styling (Teal)
                style={{ marginTop: '20px' }}
            >
                Create Session
            </button>
            
            {/* Message Display */}
            {message && (
                <p 
                    style={{ 
                        marginTop: '15px', 
                        // Use theme colors for success/error
                        color: message.startsWith('Error') ? '#e74c3c' : '#64ffda' 
                    }}
                >
                    {message}
                </p>
            )}
        </form>
    );
}

export default LiveSessionsAdmin;