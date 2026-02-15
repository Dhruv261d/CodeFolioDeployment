// client/src/components/ProblemSolvingPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../firebase.js';
import Editor from '@monaco-editor/react';

function ProblemSolvingPage({ problemId, onBack, isPracticeMode = false }) {
    const [problem, setProblem] = useState(null);
    const [code, setCode] = useState('// Your code here');
    const [language, setLanguage] = useState('javascript');
    const [output, setOutput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState('');
    const [failedTestCase, setFailedTestCase] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [warnings, setWarnings] = useState(0);
    const [isDisqualified, setIsDisqualified] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');
    const isPracticeRef = useRef(isPracticeMode);

    useEffect(() => {
        isPracticeRef.current = isPracticeMode;
    }, [isPracticeMode]);

    useEffect(() => {
        const fetchProblemDetails = async () => {
            if (!auth.currentUser) {
                setError("You must be logged in to view a problem.");
                setLoading(false);
                return;
            }
            try {
                const idToken = await auth.currentUser.getIdToken();
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/problems/${problemId}`, {
                    headers: { 'Authorization': `Bearer ${idToken}` }
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch problem details.');
                }
                const data = await response.json();
                setProblem(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (problemId) {
            fetchProblemDetails();
        }
    }, [problemId]);

    useEffect(() => {
        const checkBookmarkStatus = async () => {
            if (!auth.currentUser || !problemId) return;
            try {
                const idToken = await auth.currentUser.getIdToken();
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/problems/${problemId}/bookmark-status`, {
                    headers: { 'Authorization': `Bearer ${idToken}` }
                });
                const data = await response.json();
                if (response.ok) {
                    setIsBookmarked(data.isBookmarked);
                }
            } catch (err) {
                console.error("Failed to check bookmark status:", err);
            }
        };
        checkBookmarkStatus();
    }, [problemId]);


    useEffect(() => {
        // Anti-cheating features are only active during a live contest
        if (isPracticeMode || isDisqualified) {
            return;
        }

        const handleVisibilityChange = () => {
            if (document.hidden) {
                const newWarningCount = warnings + 1;
                setWarnings(newWarningCount);

                if (newWarningCount === 1) {
                    setWarningMessage('First Warning: Leaving the contest tab is not allowed. Please remain on this page to avoid penalties.');
                } else if (newWarningCount === 2) {
                    setWarningMessage('FINAL WARNING: Leaving the tab again will result in your immediate disqualification.');
                } else if (newWarningCount >= 3) {
                    setWarningMessage('You have been disqualified for leaving the contest tab multiple times.');
                    setIsDisqualified(true);
                    sessionStorage.setItem(`disqualified_${problemId}`, 'true'); 
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup the event listener when the component unmounts
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isPracticeMode, warnings, isDisqualified]);

    
    useEffect(() => {
        // Check session storage on page load to enforce disqualification
        const disqualifiedStatus = sessionStorage.getItem(`disqualified_${problemId}`);
        if (disqualifiedStatus === 'true') {
            setIsDisqualified(true);
            setWarningMessage('You have been disqualified for leaving the contest tab multiple times.');
        }
    }, [problemId]);

    const handleRunCode = async () => {
        setIsProcessing(true);
        setOutput('');
        setSubmissionStatus('');
        setFailedTestCase(null);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/execute/run`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    language: language,
                    code: code,
                    input: problem.sampleInput
                })
            });
            const result = await response.json();
            
            if (result.status && result.status.id > 3) {
                setOutput(`Error: ${result.status.description}\n\n${result.stderr || result.compile_output || ''}`);
            } else if (result.stdout === null) {
                setOutput('(No output)');
            } else {
                setOutput(result.stdout);
            }
        } catch (err) {
            setOutput(`An error occurred: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSubmitCode = async () => {
    setIsProcessing(true);
    setOutput('');
    setSubmissionStatus('Submitting...');
    setFailedTestCase(null);

    // This is the new logic: choose the correct API endpoint
    const endpoint = isPracticeMode ? '/api/execute/practice' : '/api/execute/submit';

    try {
      if (!auth.currentUser) throw new Error("Authentication error.");
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          language: language,
          code: code,
          problemId: problemId
        })
      });
      const result = await response.json();
      setSubmissionStatus(result.status);
      setOutput(result.message);
      if (result.failedTestCase) {
        setFailedTestCase(result.failedTestCase);
      }
    } catch (err) {
      setSubmissionStatus('Error');
      setOutput(`An error occurred: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
    };

    const handleBookmarkClick = async () => {
        if (!auth.currentUser || !problemId) return;
        try {
            const idToken = await auth.currentUser.getIdToken();
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/problems/${problemId}/bookmark`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${idToken}` }
            });
            if (response.ok) {
                // Toggle the bookmark state to immediately update the UI
                setIsBookmarked(prev => !prev);
            }
        } catch (err) {
            console.error("Failed to toggle bookmark:", err);
            }
    };

    const handlePaste = (e) => {
        if (!isPracticeMode) {
            e.preventDefault();
            setOutput('Pasting code is disabled during a live contest.');
        }
    };

    
    const handleEditorDidMount = (editor, monaco) => {
    // This is the correct way to disable paste in the Monaco Editor
    editor.onDidPaste((e) => {
        // Use the ref to get the CURRENT value of isPracticeMode
        if (!isPracticeRef.current) {
            setOutput('Pasting code is disabled during a live contest.');
            // This is a workaround to "cancel" the paste by immediately
            // reverting the text to what it was before the paste.
            const model = editor.getModel();
            setTimeout(() => {
                model.undo();
            }, 0);
        }
    });
  };

    if (loading) return <div>Loading problem...</div>;
    if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;
    if (!problem) return <div>Problem not found.</div>;

    const styles = {
        problemContainer: { flex: 1, overflowY: 'auto', padding: '25px', border: '1px solid #dee2e6', borderRadius: '8px', backgroundColor: '#fff', color: '#212529' },
        title: { margin: '0 0 10px 0', fontSize: '1.8rem', color: '#343a40' },
        difficultyBadge: { padding: '6px 12px', backgroundColor: problem.difficulty === 'Easy' ? '#d4edda' : problem.difficulty === 'Medium' ? '#fff3cd' : '#f8d7da', color: problem.difficulty === 'Easy' ? '#155724' : problem.difficulty === 'Medium' ? '#856404' : '#721c24', borderRadius: '15px', display: 'inline-block', fontWeight: '600', fontSize: '0.9rem' },
        description: { whiteSpace: 'pre-wrap', color: '#495057', lineHeight: '1.6', marginTop: '20px' },
        sectionTitle: { marginTop: '30px', marginBottom: '10px', fontSize: '1.2rem', color: '#343a40', borderBottom: '1px solid #eee', paddingBottom: '5px' },
        preformatted: { backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', border: '1px solid #e9ecef', whiteSpace: 'pre-wrap', wordWrap: 'break-word', color: '#333' }
    };

    return (
        <div>
         {(warningMessage) && (
             <div style={{
                 position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                 backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 1000,
                 display: 'flex', justifyContent: 'center', alignItems: 'center'
             }}>
                 <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', textAlign: 'center', maxWidth: '450px' }}>
                     <h2 style={{color: '#dc3545', fontSize: '1.8rem'}}>{isDisqualified ? 'Disqualified' : 'Warning'}</h2>
                     <p style={{fontSize: '1.1rem', color: '#333', lineHeight: '1.5'}}>{warningMessage}</p>
                     {!isDisqualified && 
                         <button onClick={() => setWarningMessage('')} style={{padding: '10px 20px', marginTop: '10px', cursor: 'pointer'}}>I Understand</button>
                     }
                 </div>
             </div>
         )}
            <button onClick={onBack} style={{ marginBottom: '20px' }}>&larr; Back to Problems List</button>
            <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 150px)' }}>
                {/* Left Side: Problem Description */}
                <div style={styles.problemContainer}>
                    <h2 style={styles.title}>{problem.title}</h2>
                    <button onClick={handleBookmarkClick} style={{
                            backgroundColor: isBookmarked ? '#007bff' : '#f0f0f0',
                            color: isBookmarked ? '#fff' : '#333',
                            border: '1px solid #ccc',
                            borderRadius: '5px',
                            padding: '5px 10px',
                            cursor: 'pointer'
                        }}>
                            {isBookmarked ? 'Bookmarked ★' : 'Bookmark ☆'}
                    </button>
                    <p style={styles.difficultyBadge}>{problem.difficulty}</p>
                    <p style={styles.description}>{problem.description}</p>
                    <h3 style={styles.sectionTitle}>Constraints</h3>
                    <pre style={styles.preformatted}>{problem.constraints}</pre>
                    <h3 style={styles.sectionTitle}>Sample Input</h3>
                    <pre style={styles.preformatted}>{problem.sampleInput}</pre>
                    <h3 style={styles.sectionTitle}>Sample Output</h3>
                    <pre style={styles.preformatted}>{problem.sampleOutput}</pre>
                </div>

                {/* Right Side: Code Editor and Output */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{marginBottom: '10px'}}>
                        <label style={{color: '#333'}}>Language: </label>
                        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                            <option value="javascript">JavaScript</option>
                            <option value="python">Python</option>
                            <option value="java">Java</option>
                            <option value="cpp">C++</option>
                        </select>
                    </div>
                    <div onPaste={handlePaste} style={{ flexGrow: 1, minHeight: 0, border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}>
                        <Editor
                            height="100%"
                            language={language}
                            theme="vs-dark"
                            value={code}
                            onChange={(value) => setCode(value)}
                            onMount={handleEditorDidMount}
                            options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on', scrollBeyondLastLine: false, readOnly: isDisqualified }}
                        />
                    </div>
                    <div style={{ flexShrink: 0, marginTop: '10px' }}>
                        <h3 style={{color: '#333', margin: '0 0 5px 0'}}>Output:</h3>
                        <div style={{
                            backgroundColor: '#333',
                            borderRadius: '5px',
                            border: '1px solid #e9ecef',
                            height: '150px', // Fixed height for the output area
                            overflowY: 'auto', // Make it scrollable
                        }}>
                            <pre style={{
                                padding: '15px', margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word',
                                color: submissionStatus === 'Wrong Answer' || submissionStatus === 'Error' || (output || '').startsWith('Error') ? '#ff4d4d' : submissionStatus === 'Accepted' ? '#4dff4d' : '#e9ecef'
                            }}>
                                {isProcessing ? 'Processing...' : (output || 'Click "Run" or "Submit" to see the result.')}
                            </pre>
                            {failedTestCase && (
                                <div style={{padding: '0 15px 15px 15px'}}>
                                    <h4 style={{color: '#ff4d4d', margin: '15px 0 10px 0', borderTop: '1px solid #555', paddingTop: '10px'}}>Failed Test Case Details:</h4>
                                    <div><strong>Input:</strong><pre style={{...styles.preformatted, backgroundColor: '#444', color: '#fff'}}>{failedTestCase.input}</pre></div>
                                    <div><strong>Your Output:</strong><pre style={{...styles.preformatted, backgroundColor: '#444', color: '#fff'}}>{failedTestCase.actualOutput}</pre></div>
                                    <div><strong>Expected Output:</strong><pre style={{...styles.preformatted, backgroundColor: '#444', color: '#fff'}}>{failedTestCase.expectedOutput}</pre></div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div style={{ marginTop: '10px', flexShrink: 0 }}>
                        <button onClick={handleRunCode} disabled={isProcessing || isDisqualified} style={{ marginRight: '10px', padding: '10px 15px' }}>
                            {isProcessing ? 'Processing...' : 'Run'}
                        </button>
                        <button onClick={handleSubmitCode} disabled={isProcessing || isDisqualified} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '5px' }}>
                            {isProcessing ? 'Processing...' : 'Submit'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProblemSolvingPage;