// client/src/components/ContestList.jsx
import React, { useState, useEffect } from 'react';
import { auth } from '../firebase.js';

function ContestList({ onAddProblemClick, setContestView }) {
    const [contests, setContests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const parseFirestoreDate = (timestamp) => {
        if (!timestamp) return null;
        const seconds = timestamp.seconds ?? timestamp._seconds;
        if (typeof seconds === 'number') return new Date(seconds * 1000);
        if (typeof timestamp === 'string') {
            const parsed = new Date(timestamp);
            return isNaN(parsed.getTime()) ? null : parsed;
        }
        if (timestamp instanceof Date) return timestamp;
        return null;
    };

    const getContestStatus = (startTime, endTime) => {
        const now = new Date();
        const start = parseFirestoreDate(startTime);
        const end = parseFirestoreDate(endTime);
        if (!start || !end) return { text: 'Invalid Date' };
        if (now < start) return { text: 'Upcoming' };
        if (now >= start && now < end) return { text: 'Active' };
        return { text: 'Finished' };
    };

    const fetchContests = async () => {
        if (!auth.currentUser) {
            setError("Authentication session expired. Please log in again.");
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const idToken = await auth.currentUser.getIdToken();
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/contests`, {
                headers: { 'Authorization': `Bearer ${idToken}` }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch contests.');
            }

            const data = await response.json();
            const sorted = data.sort((a, b) => {
                const aStart = parseFirestoreDate(a.startTime)?.getTime() || 0;
                const bStart = parseFirestoreDate(b.startTime)?.getTime() || 0;
                return bStart - aStart;
            });
            setContests(sorted);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFinalize = async (contestId) => {
        setMessage('Finalizing...');
        try {
            const idToken = await auth.currentUser.getIdToken();
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/contests/${contestId}/finalize`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${idToken}` }
            });
            if (!response.ok) throw new Error('Failed to finalize.');
            setMessage('Leaderboard finalized successfully!');
            fetchContests();
        } catch (err) {
            setMessage(`Error: ${err.message}`);
        }
    };

    useEffect(() => {
        fetchContests();
    }, []);

    if (loading) return <div>Loading contests...</div>;
    if (error) return <div style={{ color: '#e74c3c' }}>Error: {error}</div>;

    return (
        <div className="admin-table-container">
            <div className='Exist-button'>
                <h2>Existing Contests</h2>
                <button
                    onClick={() => setContestView('create')}
                    className="admin-button primary create-contest-button"
                    style={{ marginBottom: '30px' }}
                >
                    Create New Contest
                </button>
            </div>
            {message && <p>{message}</p>}
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Start Time</th>
                        <th>End Time</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {contests.length > 0 ? (
                        contests.map(contest => {
                            const status = getContestStatus(contest.startTime, contest.endTime);
                            const startDate = parseFirestoreDate(contest.startTime);
                            const endDate = parseFirestoreDate(contest.endTime);

                            return (
                                <tr key={contest.id}>
                                    <td>{contest.title}</td>
                                    <td>{startDate ? startDate.toLocaleString('en-IN') : 'Invalid Date'}</td>
                                    <td>{endDate ? endDate.toLocaleString('en-IN') : 'Invalid Date'}</td>
                                    <td>{status.text}</td>
                                    <td className="contest-actions">
                                        <button onClick={() => onAddProblemClick(contest.id)} className="admin-button secondary">Add Problem</button>
                                        {status.text === 'Finished' && !contest.isFinalized && (
                                            <button onClick={() => handleFinalize(contest.id)} className="admin-button primary finalize-button">
                                                Finalize
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan="5" style={{ textAlign: 'center' }}>
                                No contests found. Create one!
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default ContestList;
