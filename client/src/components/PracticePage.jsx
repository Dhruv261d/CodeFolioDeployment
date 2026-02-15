// client/src/components/PracticePage.jsx
import React, { useState, useEffect } from 'react';
import { auth } from '../firebase.js';
import '../css/ContestPage.css'; // Reuse the same CSS file

function PracticePage({ contestId, onBack, onSolveClick }) {
    const [problems, setProblems] = useState([]);
    const [contest, setContest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchContestAndProblems = async () => {
            if (!auth.currentUser || !contestId) return;
            try {
                const idToken = await auth.currentUser.getIdToken();
                
                // Fetch both contest and problem data
                const [contestRes, problemsRes] = await Promise.all([
                    fetch(`${import.meta.env.VITE_API_URL}/api/contests/${contestId}`, { headers: { 'Authorization': `Bearer ${idToken}` } }),
                    fetch(`${import.meta.env.VITE_API_URL}/api/contests/${contestId}/problems`, { headers: { 'Authorization': `Bearer ${idToken}` } })
                ]);

                if (!contestRes.ok) throw new Error('Failed to fetch contest details.');
                if (!problemsRes.ok) throw new Error('Failed to fetch problems.');
                
                const contestData = await contestRes.json();
                const problemsData = await problemsRes.json();
                
                setContest(contestData);
                setProblems(problemsData);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (contestId) {
            fetchContestAndProblems();
        }
    }, [contestId]);

    if (loading) return <div>Loading practice session...</div>;
    if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

    const getDifficultyClass = (difficulty) => {
        switch (difficulty) {
            case 'Easy': return 'difficulty-easy';
            case 'Medium': return 'difficulty-medium';
            case 'Hard': return 'difficulty-hard';
            default: return '';
        }
    };

    // Instructions specific to practice mode
    const practiceInstructions = `
        <h4>Practice Mode</h4>
        <p>Welcome to the practice arena! Here you can solve problems from past contests at your own pace.</p>
        <ul>
            <li>There is <strong>no timer</strong> in practice mode.</li>
            <li>Submissions are <strong>not saved</strong> and do not affect your rating or contest history.</li>
            <li>You can view the test cases for incorrect submissions to help you debug.</li>
            <li>This is a great way to learn new concepts and prepare for future contests.</li>
        </ul>
        <p>Happy coding!</p>
    `;

    return (
        <div className="contest-page-container">
            <div className="contest-page-header">
                <button onClick={onBack} className="back-button">&larr; Back</button>
                <h2 className="contest-page-title">Practice: {contest?.title || ''}</h2>
            </div>
            
            <div className="contest-grid">
                {/* Left Column: Instructions */}
                <div className="instructions-card">
                    <h3 className="instructions-title">Practice Instructions</h3>
                    <div 
                        className="instructions-content" 
                        dangerouslySetInnerHTML={{ __html: practiceInstructions }}
                    />
                </div>

                {/* Right Column: Problem List */}
                <div className="problem-list-container">
                    {problems.length > 0 ? (
                        problems.map((problem, index) => (
                            <div key={problem.id} className="problem-list-item">
                                <div className="problem-index">{index + 1}</div>
                                <div className="problem-title">{problem.title}</div>
                                <div className={getDifficultyClass(problem.difficulty)}>
                                    {problem.difficulty}
                                </div>
                                <div>
                                    {/* The onSolveClick prop now correctly receives 'true' for isPractice */}
                                    <button onClick={() => onSolveClick(problem.id, true)} className="solve-button">Practice</button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', color: '#8892b0' }}>
                            No problems found for this contest.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PracticePage;