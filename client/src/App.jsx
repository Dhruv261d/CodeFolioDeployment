// client/src/App.jsx
import React, { useState, useEffect } from 'react';
import { auth } from './firebase.js';
import { onAuthStateChanged, signOut } from "firebase/auth";
import AdminDashboard from './components/AdminDashboard.jsx';
import StudentDashboard from './components/StudentDashboard.jsx';
import Homepage from './components/Homepage.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // This effect runs once on startup to check the user's authentication status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // If a user is logged into Firebase, fetch their role from our backend
        try {
          const idToken = await firebaseUser.getIdToken();
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${idToken}` }
          });
          // const response = await fetch('http://localhost:5000/api/auth/me', {
          //   headers: { 'Authorization': `Bearer ${idToken}` }
          // });

          if (!response.ok) {
            // If the user exists in Firebase Auth but not in our database, sign them out.
            await signOut(auth);
            setUser(null);
          } else {
            const data = await response.json();
            setUser(data.user); // Set the full user profile, including their role
          }
        } catch (error) {
          console.error("Failed to fetch user details:", error);
          await signOut(auth);
          setUser(null);
        }
      } else {
        // No user is signed in
        setUser(null);
      }
      setLoading(false);
    });
    // Cleanup subscription on component unmount
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  // This function forces a reload to fetch user data after a successful login
  const handleLoginSuccess = () => {
      window.location.reload();
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading Application...</div>;
  }

  const renderContent = () => {
    if (user?.role === 'admin') {
      return <AdminDashboard admin={user} onLogout={handleLogout} />;
    }
    if (user?.role === 'student') {
      return <StudentDashboard user={user} onLogout={handleLogout} />;
    }
    // If there's no user, show the new Homepage with the login form
    return <Homepage onLoginSuccess={handleLoginSuccess} />;
  };

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      boxSizing: 'border-box'
    }}>
      {renderContent()}
    </div>
  );
}

export default App;