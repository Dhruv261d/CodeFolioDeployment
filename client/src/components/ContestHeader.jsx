// client/src/components/ContestHeader.jsx
import React, { useState, useEffect } from 'react';
import { auth } from '../firebase.js';
import CountdownTimer from './CountdownTimer.jsx';

// THIS IS THE FIX: Using the same robust date logic from your other components
const parseFirestoreDate = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
  if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
};


function ContestHeader({ contestId }) {
    const [contest, setContest] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContestDetails = async () => {
            if (!auth.currentUser || !contestId) return;
            try {
                const idToken = await auth.currentUser.getIdToken();
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/contests/${contestId}`, {
                    headers: { 'Authorization': `Bearer ${idToken}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setContest(data);
                }
            } catch (error) {
                console.error("Failed to fetch contest details for header:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchContestDetails();
    }, [contestId]);

    if (loading || !contest) {
        return <div style={{ padding: '10px 0', borderBottom: '1px solid #ccc' }}>Loading timer...</div>;
    }
    
    // THIS IS THE FIX: We now use our robust parser on the timestamp object
    const endTime = parseFirestoreDate(contest.endTime);

    return (
        <div style={{ 
            padding: '15px 20px', 
            // border: '1px solid #dee2e6', 
            borderRadius: '8px', 
            // backgroundColor: '#172a45', 
            marginBottom: '30px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
        }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#dee2e6' }}>{contest.title}</h2>
            {endTime ? (
                <CountdownTimer targetDate={endTime} prefix={"Time Remaining: "} />
            ) : (
                <span style={{color: 'red'}}>Timer unavailable</span>
            )}
        </div>
    );
}

export default ContestHeader;