// client/src/components/ContestHistory.jsx
import React, { useState, useEffect } from 'react';
import { auth } from '../firebase.js';
import { parseFirestoreDate } from '../utils/contestUtils.js'; // ✅ Use shared utility
import '../css/ContestWidgets.css';

function ContestHistory({ onPracticeClick, onLeaderboardClick, isEmbedded = false }) {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      if (!auth.currentUser) return;
      try {
        const idToken = await auth.currentUser.getIdToken();
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/student/contests/history`, {
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
        if (!response.ok) throw new Error('Failed to fetch contest history.');
        const data = await response.json();
        setContests(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <>
      {!isEmbedded && <h2 className="section-title">Contest History</h2>}
      {contests.length > 0 ? (
        contests.map(contest => {
          const endDate = parseFirestoreDate(contest.endTime);
          return (
            <div key={contest.id} className="contest-item-card">
              <div className="card-header">
                <h3 className="card-title">{contest.title}</h3>
                <span className="card-status finished">Finished</span>
              </div>
              <p className="card-description">{contest.description}</p>
              <div className="card-time">
                <p>Ended on: {endDate ? endDate.toLocaleString() : 'Date not available'}</p>
              </div>
              <div className="card-buttons" style={{ marginTop: '15px' }}>
                <button onClick={() => onPracticeClick(contest.id)} className="card-button history-practice">
                  Practice
                </button>
                <button onClick={() => onLeaderboardClick(contest.id)} className="card-button secondary">
                  View Leaderboard
                </button>
              </div>
            </div>
          );
        })
      ) : (
        <p style={{ color: '#666' }}>No past contests found.</p>
      )}
    </>
  );
}

export default ContestHistory;
