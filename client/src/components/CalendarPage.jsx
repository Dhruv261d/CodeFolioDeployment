// client/src/components/CalendarPage.jsx
import React, { useState, useEffect } from 'react';
import { auth } from '../firebase.js';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import Modal from 'react-modal';

import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);
Modal.setAppElement('#root');

function CalendarPage() {
    const [allContests, setAllContests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState('month');

    useEffect(() => {
        const fetchAllContests = async () => {
            if (!auth.currentUser) {
                setError("You must be logged in to view the calendar.");
                setLoading(false);
                return;
            }
            try {
                const idToken = await auth.currentUser.getIdToken();
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/contests/all`, {
                    headers: { 'Authorization': `Bearer ${idToken}` }
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch contest data for calendar.');
                }
                const data = await response.json();
                setAllContests(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAllContests();
    }, []);

    if (loading) return <div>Loading Calendar...</div>;
    if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

    const calendarEvents = allContests.map(contest => ({
        title: contest.title,
        start: new Date(contest.startTime),
        end: new Date(contest.endTime),
        allDay: false,
        resource: contest,
    }));

    const upcomingContests = allContests
        .filter(c => new Date(c.startTime) > new Date())
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        
    const handleEventClick = (event) => {
        setSelectedEvent(event);
    };

    const closeModal = () => {
        setSelectedEvent(null);
    };

    const handleNavigate = (newDate) => {
        setCurrentDate(newDate);
    };

    const handleViewChange = (newView) => {
        setCurrentView(newView);
    };

    return (
        <div style={{ backgroundColor: '#f8f9fa', padding: '30px' }}>
            {/* UPDATED: Added new styles for the Agenda view */}
            <style>{`
                .rbc-calendar { font-family: 'Segoe UI', sans-serif; }
                .rbc-toolbar button {
                    color: #343a40 !important; border: 1px solid #ced4da !important;
                    border-radius: 6px !important; padding: 6px 12px !important;
                    transition: background-color 0.2s ease;
                }
                .rbc-toolbar .rbc-btn-group button {
                    margin: 0 3px !important;
                }
                .rbc-toolbar button:hover, .rbc-toolbar button:focus { background-color: #dee2e6 !important; }
                .rbc-event {
                    background-color: #007bff !important; border-color: #0056b3 !important;
                    color: #fff !important; border-radius: 6px !important; padding: 4px 8px !important;
                }
                .rbc-header, .rbc-date-cell, .rbc-toolbar-label, .rbc-time-header-content .rbc-header, .rbc-time-slot .rbc-label {
                    color: #343a40;
                }
                .rbc-today {
                    background-color: #eaf6ff !important;
                }
                /* THIS IS THE FIX: New Styles for Agenda View */
                .rbc-agenda-view table { border: 1px solid #dee2e6; color: #343a40; }
                .rbc-agenda-view table thead { background-color: #f1f3f5; }
                .rbc-agenda-view table .rbc-header { color: #343a40; font-weight: 600; padding: 10px; }
                .rbc-agenda-table tbody tr:hover { background-color: #f1f3f5 !important; }
                .rbc-agenda-table .rbc-agenda-td-event { color: #0d6efd; font-weight: 500; }
                .rbc-time-header-gutter, .rbc-time-gutter { background-color: #f8f9fa; }
                /* Your custom scrollbar styling */
                ::-webkit-scrollbar { width: 8px; }
                ::-webkit-scrollbar-track { background: #f1f1f1; }
                ::-webkit-scrollbar-thumb { background-color: #ced4da; border-radius: 4px; }
            `}</style>
            
            <div style={{ display: 'flex', gap: '30px', fontFamily: "'Segoe UI', sans-serif" }}>
                <div style={{ flex: '1 1 30%', maxWidth: '400px' }}>
                    <h2 style={{ fontSize: '1.6rem', color: '#212529', marginBottom: '20px' }}>Upcoming Contests</h2>
                    <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '10px' }}>
                        {upcomingContests.length > 0 ? (
                            upcomingContests.map(contest => (
                                <div key={contest.id} style={{
                                    display: 'flex', alignItems: 'center', gap: '15px', backgroundColor: '#ffffff',
                                    border: '1px solid #dee2e6', padding: '15px', borderRadius: '10px',
                                    marginBottom: '15px', boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
                                    transition: 'transform 0.2s ease, box-shadow 0.2s ease', cursor: 'pointer'
                                }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                                   onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                                    <div style={{width: '8px', height: '8px', backgroundColor: '#007bff', borderRadius: '50%'}}></div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#212529' }}>{contest.title}</h3>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#6c757d' }}>
                                            {new Date(contest.startTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p style={{ color: '#6c757d' }}>No upcoming contests are scheduled.</p>
                        )}
                    </div>
                </div>

                <div style={{
                    flex: '1 1 70%', height: '80vh', backgroundColor: '#ffffff', padding: '20px',
                    borderRadius: '12px', border: '1px solid #dee2e6', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                }}>
                    <Calendar
                        localizer={localizer}
                        events={calendarEvents}
                        startAccessor="start"
                        endAccessor="end"
                        onSelectEvent={handleEventClick}
                        date={currentDate}
                        view={currentView}
                        onNavigate={handleNavigate}
                        onView={handleViewChange}
                    />
                </div>
            </div>

            <Modal
                isOpen={!!selectedEvent}
                onRequestClose={closeModal}
                style={{
                    overlay: { backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 1001 },
                    content: {
                        top: '50%', left: '50%', right: 'auto', bottom: 'auto',
                        marginRight: '-50%', transform: 'translate(-50%, -50%)',
                        width: '90%', maxWidth: '500px', border: 'none',
                        borderRadius: '10px', padding: '30px', 
                        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                        fontFamily: "'Segoe UI', sans-serif"
                    }
                }}
            >
                {selectedEvent && (
                    <div>
                        <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#343a40', fontSize: '1.6rem' }}>{selectedEvent.title}</h2>
                        <p style={{margin: '10px 0', color: '#495057'}}><strong>Starts:</strong> {selectedEvent.start.toLocaleString('en-IN')}</p>
                        <p style={{margin: '10px 0', color: '#495057'}}><strong>Ends:</strong> {selectedEvent.end.toLocaleString('en-IN')}</p>
                        <button onClick={closeModal} style={{ 
                            marginTop: '25px', padding: '10px 25px', backgroundColor: '#6c757d',
                            color: '#fff', border: 'none', borderRadius: '6px',
                            cursor: 'pointer', fontWeight: '600', fontSize: '1rem',
                            transition: 'background-color 0.2s ease'
                        }}>
                            Close
                        </button>
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default CalendarPage;