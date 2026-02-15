// client/src/components/ContestPage.jsx
import React, { useState, useEffect } from 'react';
import { auth } from '../firebase.js';
import '../css/ContestPage.css';

function ContestPage({ contestId, onBack, onSolveClick }) {
    const [contest, setContest] = useState(null);
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchContestData = async () => {
            if (!auth.currentUser || !contestId) return;
            setLoading(true);
            try {
                const idToken = await auth.currentUser.getIdToken();
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

        fetchContestData();
    }, [contestId]);

    if (loading) return <div>Loading contest...</div>;
    if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

    const getDifficultyClass = (difficulty) => {
        switch (difficulty) {
            case 'Easy': return 'difficulty-easy';
            case 'Medium': return 'difficulty-medium';
            case 'Hard': return 'difficulty-hard';
            default: return '';
        }
    };

    // --- UPDATED: LeetCode-style contest rules from your screenshots ---
    const leetCodeStyleInstructions = `
        <h4>Important Notes</h4>
        <ul>
            <li>The penalty time of <strong>5 minutes</strong> will be applied for each wrong submission.</li>
            <li>To ensure the fairness of the contest, hidden test cases will not be revealed for incorrect submissions.</li>
            <li>The final rating for this contest will be updated within 5 working days.</li>
        </ul>

        <h4>Contest Violations</h4>
        <p>The following actions are considered contest violations:</p>
        <ul>
            <li>Submitting from multiple accounts during a single contest.</li>
            <li>Multiple accounts submitting similar code for the same problem.</li>
            <li>Disclosing contest-related content (e.g., solutions) publicly before the contest ends.</li>
            <li>Using code generation tools or any external assistance to solve problems is strictly prohibited.</li>
        </ul>

        <h4>Penalties for Violation</h4>
        <p>This platform has a <strong>ZERO TOLERANCE</strong> policy for cheating and plagiarism. Users found to be in violation of contest rules will face the following penalties:</p>
        <ul>
            <li><strong>First Violation:</strong> Contest score will be reset to zero and the account will be banned for 1 month.</li>
            <li><strong>Second Violation:</strong> Contest score will be reset to zero and the account will be permanently deactivated without appeal.</li>
        </ul>
        <p>Good luck and compete fairly!</p>
    `;

    const finalInstructions = leetCodeStyleInstructions;

    return (
        <div className="contest-page-container">
            <div className="contest-page-header">
                <button onClick={onBack} className="back-button">&larr; Back</button>
                {/* <h2 className="contest-page-title">{contest?.title || 'Contest'}</h2> */}
            </div>
            
            <div className="contest-grid">
                <div className="instructions-card">
                    <h3 className="instructions-title">Rules & Instructions</h3>
                    <div 
                        className="instructions-content" 
                        dangerouslySetInnerHTML={{ __html: finalInstructions }}
                    />
                </div>

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
                                    <button onClick={() => onSolveClick(problem.id)} className="solve-button">Solve</button>
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

export default ContestPage;