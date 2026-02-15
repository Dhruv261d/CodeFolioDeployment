import React, { useState, useEffect } from 'react';
import { auth } from '../firebase.js';
import '../css/ContestLeaderboard.css'; // Assuming this is the new name for the CSS file

function Leaderboard({ contestId, onBack }) {
    const [leaderboard, setLeaderboard] = useState([]);
    const [problems, setProblems] = useState([]);
    const [contestTitle, setContestTitle] = useState(''); // State for the contest title
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 20;

    useEffect(() => {
        const fetchLeaderboardData = async () => {
            if (!auth.currentUser || !contestId) {
                setError("You must be logged in to view the leaderboard.");
                setLoading(false);
                return;
            }
            try {
                const idToken = await auth.currentUser.getIdToken();

                // Fetch both leaderboard data and contest details at the same time
                const [leaderboardRes, contestRes] = await Promise.all([
                    fetch(`${import.meta.env.VITE_API_URL}/api/contests/${contestId}/leaderboard`, {
                        headers: { 'Authorization': `Bearer ${idToken}` }
                    }),
                    fetch(`${import.meta.env.VITE_API_URL}/api/contests/${contestId}`, {
                        headers: { 'Authorization': `Bearer ${idToken}` }
                    })
                ]);

                if (!leaderboardRes.ok) throw new Error('Failed to fetch leaderboard data.');
                if (!contestRes.ok) throw new Error('Failed to fetch contest details.');

                const leaderboardData = await leaderboardRes.json();
                const contestData = await contestRes.json();

                setLeaderboard(leaderboardData.leaderboard);
                setProblems(leaderboardData.problems);
                setContestTitle(contestData.title); // Set the contest title

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (contestId) {
            fetchLeaderboardData();
        }
    }, [contestId]);

    const formatTime = (totalSeconds) => {
        if (totalSeconds === 0 && leaderboard.length > 0) return "00:00:00";
        if (totalSeconds === 0) return "--:--:--";
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const totalPages = Math.ceil(leaderboard.length / usersPerPage);
    const startIndex = (currentPage - 1) * usersPerPage;
    const currentUsers = leaderboard.slice(startIndex, startIndex + usersPerPage);

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    if (loading) return <div className="leaderboard-loading">Loading leaderboard...</div>;
    if (error) return <div className="leaderboard-error">Error: {error}</div>;

    return (
        <div className="contest-leaderboard-container">
            <button onClick={onBack} className="back-button">&larr; Back</button>

            {/* Title now dynamically displays the contest name */}
            <h2 className="leaderboard-title">{contestTitle} Leaderboard</h2>

            <table className="leaderboard-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Name</th>
                        <th>Score</th>
                        {/* <th>Finish Time</th> */}
                        {/* {problems.map((p, index) => (
                            <th key={p.id}>{`Q${index + 1}`}</th>
                        ))} */}
                    </tr>
                </thead>
                <tbody>
                    {currentUsers.length > 0 ? (
                        currentUsers.map((entry, index) => (
                            <tr key={entry.userId}>
                                <td className="rank-cell">{startIndex + index + 1}</td>
                                <td className="user-cell">{entry.userName}</td>
                                <td className="score-cell">{entry.score}</td>
                                {/* <td className="time-cell">{formatTime(entry.finishTime)}</td> */}
                                {/* {problems.map(p => {
                                    const detail = entry.problemDetails[p.id];
                                    if (detail?.solved) {
                                        return (
                                            <td key={p.id} className="solved-cell">
                                                <div>{formatTime(detail.solveTime)}</div>
                                                <div>({detail.attempts} {detail.attempts > 1 ? 'tries' : 'try'})</div>
                                            </td>
                                        );
                                    } else if (detail?.attempts > 0) {
                                        return <td key={p.id} className="attempted-cell">-{detail.attempts}</td>;
                                    } else {
                                        return <td key={p.id} className="empty-cell">-</td>;
                                    }
                                })} */}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={4 + problems.length} className="no-submissions">
                                No submissions yet. Be the first!
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {totalPages > 1 && (
                <div className="pagination-controls">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                    >
                        &larr; Prev
                    </button>
                    <span>
                        Page {Math.max(1, currentPage)} of {Math.max(1, totalPages)}
                    </span>
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                    >
                        Next &rarr;
                    </button>
                </div>
            )}
        </div>
    );
}

export default Leaderboard;