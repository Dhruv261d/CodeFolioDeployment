// client/src/components/AddStudentForm.jsx
import React, { useState } from 'react';
import { auth } from '../firebase.js';

function AddStudentForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [prn, setPrn] = useState('');
  const [year, setYear] = useState('1');
  const [branch, setBranch] = useState('Computer Science');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleAddStudent = async (event) => {
    event.preventDefault();
    setMessage('');
    const studentData = { email, password, name, prn, year, branch };
    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/students/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify(studentData),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }
      setMessage(`Success: ${data.message}`);
      setEmail('');
      setPassword('');
      setName('');
      setPrn('');
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  return (
    <form onSubmit={handleAddStudent} className="admin-form">
      <h2>Add New Student</h2>

      <div className="form-grid">
        {/* Row 1 */}
        <div className="form-group">
            <label>Full Name:</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="form-input" />
        </div>
        <div className="form-group">
            <label>PRN:</label>
            <input type="text" value={prn} onChange={(e) => setPrn(e.target.value)} required className="form-input" />
        </div>

        {/* Row 2 */}
        <div className="form-group full-width">
            <label>Email:</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="form-input" />
        </div>
        
        {/* Row 3 */}
        <div className="form-group full-width">
            <label>Password:</label>
            <div className="password-wrapper">
                <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="form-input"
                />
                <button
                    type="button"
                    className="toggle-password-button"
                    onClick={() => setShowPassword(!showPassword)}
                >
                    {showPassword ? 'Hide' : 'Show'}
                </button>
            </div>
        </div>

        {/* Row 4 */}
        <div className="form-group">
            <label>Year of Study:</label>
            <select value={year} onChange={(e) => setYear(e.target.value)} required className="form-select">
                <option value="1">First Year</option>
                <option value="2">Second Year</option>
                <option value="3">Third Year</option>
                <option value="4">Final Year</option>
            </select>
        </div>
        <div className="form-group">
            <label>Branch:</label>
            <select value={branch} onChange={(e) => setBranch(e.target.value)} required className="form-select">
                <option value="Computer Science">Computer Science</option>
                <option value="Information Technology">CSBS</option>
                <option value="Electronics & Telecommunication">Electronics & Telecommunication</option>
                <option value="Mechanical">Mechanical</option>
                <option value="Civil">Civil</option>
            </select>
        </div>
      </div>

      <button type="submit" className="admin-button primary" style={{marginTop: '10px'}}>Add Student</button>

      {message && (
        <p style={{ marginTop: '20px', fontWeight: 500, color: message.startsWith('Error') ? '#e74c3c' : '#64ffda' }}>
          {message}
        </p>
      )}
    </form>
  );
}

export default AddStudentForm;