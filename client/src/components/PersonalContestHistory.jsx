// client/src/components/PersonalContestHistory.jsx
import React, { useState, useEffect } from 'react';
import { auth } from '../firebase.js';

function PersonalContestHistory({ onPracticeClick }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            if (!auth.currentUser) {
                setError("You must be logged in to view your history.");
                setLoading(false);
                return;
            }
            try {
                const idToken = await auth.currentUser.getIdToken();
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/contest-history`, {
                    headers: { 'Authorization': `Bearer ${idToken}` }
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch contest history.');
                }
                const data = await response.json();
                setHistory(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    if (loading) return <div>Loading contest history...</div>;
    if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

    return (
        // The `profile-table` class provides all the necessary dark theme styles
        <table className="profile-table">
            <thead>
                <tr>
                    <th>Contest Name</th>
                    <th>Final Score</th>
                    <th>Rank</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {history.length > 0 ? (
                    history.map(item => (
                        <tr key={item.contestId}>
                            <td>{item.contestName}</td>
                            <td>{item.score}</td>
                            <td>{item.rank}</td>
                            <td>
                                <button onClick={() => onPracticeClick(item.contestId)} className="table-action-button">Practice</button>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan="4" style={{ textAlign: 'center' }}>
                            You haven't participated in any contests yet.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    );
}

export default PersonalContestHistory;