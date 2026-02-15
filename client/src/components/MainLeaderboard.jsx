import React, { useState, useEffect } from 'react';
import { auth } from '../firebase.js';
import '../css/MainLeaderboard.css';

function MainLeaderboard() {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 20;

    useEffect(() => {
        const fetchLeaderboard = async () => {
            if (!auth.currentUser) return;
            try {
                const idToken = await auth.currentUser.getIdToken();
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/leaderboard`, {
                    headers: { 'Authorization': `Bearer ${idToken}` }
                });
                if (!response.ok) throw new Error('Failed to fetch leaderboard.');
                const data = await response.json();
                setLeaderboard(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    const getRankClass = (index) => {
        if (index === 0) return 'rank-1';
        if (index === 1) return 'rank-2';
        if (index === 2) return 'rank-3';
        return '';
    };

    const totalPages = Math.ceil(leaderboard.length / usersPerPage);
    const startIndex = (currentPage - 1) * usersPerPage;
    const currentUsers = leaderboard.slice(startIndex, startIndex + usersPerPage);

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    if (loading) return <div>Loading Leaderboard...</div>;
    if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

    return (
        <div className="leaderboard-container">
            <h2 className="leaderboard-title">Global Leaderboard</h2>
            <table className="leaderboard-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>User</th>
                        <th>Rating</th>
                    </tr>
                </thead>
                <tbody>
                    {currentUsers.length > 0 ? (
                        currentUsers.map((entry, index) => (
                            <tr key={entry.userId} className={getRankClass(startIndex + index)}>
                                <td className="rank-cell">{startIndex + index + 1}</td>
                                <td className="user-cell">{entry.userName}</td>
                                <td className="rating-cell">{entry.rating}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="3" style={{ textAlign: 'center' }}>
                                The leaderboard is empty.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="pagination-controls">
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
                    &larr; Prev
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                    Next &rarr;
                </button>
            </div>
        </div>
    );
}

export default MainLeaderboard;
