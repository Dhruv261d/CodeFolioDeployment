import React, { useState, useEffect } from 'react';
import { auth } from '../firebase.js';
import '../css/LiveStudent.css'

const getSessionStatus = (startTime, endTime) => {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (isNaN(start) || isNaN(end)) {
    return { text: 'Invalid Date', color: '#dc3545' };
  }
  if (now < start) return { text: 'Upcoming', color: '#0d6efd' };
  if (now >= start && now < end) return { text: 'Active', color: '#198754' };
  return { text: 'Finished', color: '#6c757d' };
};

function LiveSessionsStudent() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSessions = async () => {
      if (!auth.currentUser) {
        setError("You must be logged in to view live sessions.");
        setLoading(false);
        return;
      }
      try {
        const idToken = await auth.currentUser.getIdToken();
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sessions`, {
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch live sessions.');
        }
        const data = await response.json();
        setSessions(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  if (loading) return <div className="loading">Loading live sessions...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="live-sessions-container">
      <h2 className="section-title">Live Sessions</h2>
      {sessions.length > 0 ? (
        <div className="session-grid">
          {sessions.map(session => {
            const status = getSessionStatus(session.startTime, session.endTime);
            const startDate = new Date(session.startTime);
            const endDate = new Date(session.endTime);
            const isJoinable = status.text === 'Active';

            return (
              <div key={session.id} className="session-card">
                <div className="session-header">
                  <h3 className="session-title">{session.title}</h3>
                  <span className="session-status" style={{ color: status.color }}>
                    {status.text}
                  </span>
                </div>
                <p className="session-time">
                  Starts: {startDate.toLocaleString('en-IN')}<br />
                  Ends: {endDate.toLocaleString('en-IN')}
                </p>
                <a
                  href={isJoinable ? session.meetingLink : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => !isJoinable && e.preventDefault()}
                  className={`join-button ${isJoinable ? 'active' : 'disabled'}`}
                >
                  Join Session
                </a>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="no-sessions">No live sessions are scheduled at the moment.</p>
      )}
    </div>
  );
}

export default LiveSessionsStudent;
