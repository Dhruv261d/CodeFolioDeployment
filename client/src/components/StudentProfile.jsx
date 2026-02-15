// client/src/components/StudentProfile.jsx
import React, { useState, useEffect } from 'react';
import { auth } from '../firebase.js';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import CalendarHeatmap from 'react-calendar-heatmap';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import PersonalContestHistory from './PersonalContestHistory.jsx';
import MarkedQuestions from './MarkedQuestions.jsx';

import 'react-calendar-heatmap/dist/styles.css';
import '../css/StudentProfile.css'; // Import the new CSS

function StudentProfile({ onSolveClick, onPracticeClick }) {
    const [profileData, setProfileData] = useState(null);
    const [ratingHistory, setRatingHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // Fetch logic remains the same
        const fetchProfileData = async () => {
            if (!auth.currentUser) return;
            try {
                const idToken = await auth.currentUser.getIdToken();
                const profileResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/users/profile`, { headers: { 'Authorization': `Bearer ${idToken}` } });
                if (!profileResponse.ok) throw new Error('Failed to fetch profile data.');
                const profileData = await profileResponse.json();
                setProfileData(profileData);

                const historyResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/users/rating-history`, { headers: { 'Authorization': `Bearer ${idToken}` } });
                if (!historyResponse.ok) throw new Error('Failed to fetch rating history.');
                const historyData = await historyResponse.json();
                setRatingHistory(historyData);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchProfileData();
    }, []);

    if (loading) return <div>Loading profile...</div>;
    if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;
    if (!profileData) return <div>No profile data found.</div>;

    const difficultyData = [
        { name: 'Easy', value: profileData.solvedByDifficulty.Easy || 0 },
        { name: 'Medium', value: profileData.solvedByDifficulty.Medium || 0 },
        { name: 'Hard', value: profileData.solvedByDifficulty.Hard || 0 },
    ];

    const COLORS = ['#38b2ac', '#d69e2e', '#e53e3e']; // Teal, Yellow, Red
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    return (
        <div className="profile-grid">
            {/* Stats Cards */}
            <div className="profile-card">
                <h3 className="stats-label">Total Submissions</h3>
                <p className="stats-value">{profileData.totalSubmissions}</p>
            </div>
            <div className="profile-card">
                <h3 className="stats-label">Problems Solved</h3>
                <p className="stats-value">{profileData.uniqueProblemsSolved}</p>
            </div>
            <div className="profile-card">
                <h3 className="stats-label">Submission Accuracy</h3>
                <p className="stats-value">{profileData.submissionAccuracy}%</p>
            </div>

            {/* Submission Activity Heatmap */}
            {/* <div className="profile-card span-3">
                <h2 className="profile-title">Submission Activity (Past Year)</h2>
                <CalendarHeatmap
                    startDate={oneYearAgo}
                    endDate={today}
                    values={profileData.activityData}
                    classForValue={(value) => {
                        if (!value || value.count === 0) return 'color-github-0';
                        return `color-github-${Math.min(4, Math.ceil(value.count / 2))}`;
                    }}
                    tooltipDataAttrs={value => ({
                        'data-tooltip-id': 'heatmap-tooltip',
                        'data-tooltip-content': `${value.date ? new Date(value.date).toDateString() : 'No date'}: ${value.count || 0} submissions`,
                    })}
                />
                <ReactTooltip id="heatmap-tooltip" />
            </div> */}
            <div className="profile-card span-3">
                <h2 className="profile-title">Submission Activity (Past Year)</h2>
                <CalendarHeatmap
                    startDate={oneYearAgo}
                    endDate={today}
                    values={profileData.activityData}
                    classForValue={(value) => {
                        if (!value || value.count === 0) return 'color-github-0';
                        // Scale the activity to the 4 colors
                        if (value.count == 1) return 'color-github-1';
                        if (value.count == 2) return 'color-github-2';
                        if (value.count == 3) return 'color-github-3';
                        if (value.count >= 4) return 'color-github-4';
                        return 'color-github-1';
                    }}
                    // --- THIS IS THE FIX for the tooltip ---
                    tooltipDataAttrs={value => {
                        // The `value` object can be null for empty dates, so we must check it.
                        if (!value || !value.date) {
                            // Even if there's no data, we can still show a placeholder tooltip.
                            // We return an object with the necessary attributes.
                            return {
                                'data-tooltip-id': 'heatmap-tooltip',
                                'data-tooltip-content': 'No submissions on this day.'
                            };
                        }
                        // If there is data, we format it as before.
                        return {
                            'data-tooltip-id': 'heatmap-tooltip',
                            'data-tooltip-content': `${new Date(value.date).toDateString()}: ${value.count} submissions`,
                        };
                    }}
                />
                <ReactTooltip id="heatmap-tooltip" />
            </div>

            {/* Charts */}
            <div className="profile-card">
                <h2 className="profile-title">Solved by Difficulty</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie data={difficultyData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                            {difficultyData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <RechartsTooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="profile-card span-2">
                <h2 className="profile-title">Rating History</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={ratingHistory} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid stroke="#303C55" />
                        <XAxis dataKey="date" stroke="#8892b0" />
                        <YAxis stroke="#8892b0" domain={['dataMin - 50', 'dataMax + 50']} />
                        <RechartsTooltip />
                        <Line type="monotone" dataKey="rating" stroke="#64ffda" strokeWidth={2} activeDot={{ r: 8 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Tables */}
            <div className="profile-card span-3">
                <h2 className="profile-title">Contest History</h2>
                <div className="profile-table-container">
                    {/* The table styles will be applied via CSS */}
                    <PersonalContestHistory onPracticeClick={onPracticeClick} />
                </div>
            </div>
            
            <div className="profile-card span-3">
                <h2 className="profile-title">Marked Questions</h2>
                <div className="profile-table-container">
                    <MarkedQuestions onSolveClick={onSolveClick} />
                </div>
            </div>
        </div>
    );
}

export default StudentProfile;