// client/src/components/MarkedQuestions.jsx
import React, { useState, useEffect } from 'react';
import { auth } from '../firebase.js';

function MarkedQuestions({ onSolveClick }) {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchMarkedQuestions = async () => {
            if (!auth.currentUser) {
                setError("You must be logged in to view marked questions.");
                setLoading(false);
                return;
            }
            try {
                const idToken = await auth.currentUser.getIdToken();
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/marked-questions`, {
                    headers: { 'Authorization': `Bearer ${idToken}` }
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch marked questions.');
                }
                const data = await response.json();
                setQuestions(data);
            } catch (err) {
                // --- THIS IS THE FIX: Added the missing curly brace ---
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchMarkedQuestions();
    }, []);

    if (loading) return <div>Loading marked questions...</div>;
    if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

    const getDifficultyClass = (difficulty) => {
        switch (difficulty) {
            case 'Easy': return 'difficulty-easy';
            case 'Medium': return 'difficulty-medium';
            case 'Hard': return 'difficulty-hard';
            default: return '';
        }
    };

    return (
        <table className="profile-table">
            <thead>
                <tr>
                    <th>Problem Title</th>
                    <th>Difficulty</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {questions.length > 0 ? (
                    questions.map(q => (
                        <tr key={q.id}>
                            <td>{q.title}</td>
                            <td className={getDifficultyClass(q.difficulty)}>
                                {q.difficulty}
                            </td>
                            <td>
                                <button onClick={() => onSolveClick(q.id, true)} className="table-action-button">Solve Again</button>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan="3" style={{ textAlign: 'center' }}>
                            You haven't bookmarked any questions yet.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    );
}

export default MarkedQuestions;