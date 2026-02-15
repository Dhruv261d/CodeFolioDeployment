// server/index.js
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();
const axios = require('axios');

const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


// Check if we are in production (Render) or local
// const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON 
//   ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) 
//   : require("./serviceAccountKey.json");

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const db = admin.firestore();

// --- Security Middlewares ---
const verifyToken = async (req, res, next) => {
  const idToken = req.headers.authorization?.split('Bearer ')[1];
  if (!idToken) return res.status(401).json({ message: 'Unauthorized' });
  try {
    req.user = await admin.auth().verifyIdToken(idToken);
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Forbidden' });
  }
};

const verifyAdmin = async (req, res, next) => {
  const userDoc = await db.collection('users').doc(req.user.uid).get();
  if (userDoc.exists && userDoc.data().role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Forbidden: User is not an admin.' });
  }
};

// --- AUTH & USER ROUTES ---
app.get('/api/auth/me', verifyToken, async (req, res) => {
    try {
        const userDoc = await db.collection('users').doc(req.user.uid).get();
        if (!userDoc.exists) return res.status(404).json({ message: 'User not found in database.' });
        res.status(200).json({ user: { uid: req.user.uid, email: req.user.email, ...userDoc.data() } });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user data.', error: error.message });
    }
});

app.post('/api/students/add', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { email, password, prn, name, year, branch } = req.body;
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('prn', '==', prn).get();
    if (!snapshot.empty) return res.status(409).json({ message: 'Conflict: PRN already exists.' });
    const userRecord = await admin.auth().createUser({ email, password, displayName: name });
    await usersRef.doc(userRecord.uid).set({
        prn, name, email, year, branch,
        role: 'student',
        rating: 1500, 
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.status(201).json({ message: 'Successfully created new student.', uid: userRecord.uid });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') return res.status(409).json({ message: 'Conflict: Email already exists.' });
    res.status(500).json({ message: 'Error creating new user.', error: error.message });
  }
});


app.get('/api/contests/all', verifyToken, async (req, res) => {
    try {
        const snapshot = await db.collection('contests').orderBy('startTime', 'desc').get();
        const allContests = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title,
                startTime: data.startTime.toDate(),
                endTime: data.endTime.toDate()
            };
        });
        res.status(200).json(allContests);
    } catch (error) {
        console.error("Error fetching all contests:", error);
        res.status(500).json({ message: 'Error fetching all contests.', error: error.message });
    }
});


app.post('/api/contests/create', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { title, description, startTime, endTime } = req.body;
        const newContestRef = await db.collection('contests').add({
            title, description,
            startTime: admin.firestore.Timestamp.fromDate(new Date(startTime)),
            endTime: admin.firestore.Timestamp.fromDate(new Date(endTime)),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: req.user.uid,
            isFinalized: false 

        });
        res.status(201).json({ message: 'Contest created successfully.', contestId: newContestRef.id });
    } catch (error) {
        res.status(500).json({ message: 'Error creating contest.', error: error.message });
    }
});

app.get('/api/contests', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const snapshot = await db.collection('contests').orderBy('startTime', 'desc').get();
        const contests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(contests);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching contests.', error: error.message });
    }
});

app.get('/api/student/contests', verifyToken, async (req, res) => {
    try {
        const now = admin.firestore.Timestamp.now();
        const snapshot = await db.collection('contests').where('endTime', '>=', now).orderBy('endTime', 'asc').get();
        const contests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(contests);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching contests.', error: error.message });
    }
});

app.get('/api/student/contests/history', verifyToken, async (req, res) => {
    try {
        const now = admin.firestore.Timestamp.now();
        const snapshot = await db.collection('contests').where('endTime', '<', now).orderBy('endTime', 'desc').get();
        const contests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(contests);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching contest history.', error: error.message });
    }
});

app.post('/api/problems/add', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { contestId, title, description, difficulty, points, constraints, sampleInput, sampleOutput, testCases } = req.body;
        const contestRef = db.collection('contests').doc(contestId);
        const contestDoc = await contestRef.get();
        if (!contestDoc.exists) return res.status(404).json({ message: 'Contest not found.' });
        const newProblem = {
            contestId, title, description, difficulty, points: Number(points),
            constraints, sampleInput, sampleOutput, testCases,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        const problemRef = await db.collection('problems').add(newProblem);
        res.status(201).json({ message: 'Problem added successfully.', problemId: problemRef.id });
    } catch (error) {
        res.status(500).json({ message: 'Error adding problem.', error: error.message });
    }
});

app.get('/api/contests/:contestId/problems', verifyToken, async (req, res) => {
    try {
        const { contestId } = req.params;
        const snapshot = await db.collection('problems').where('contestId', '==', contestId).get();
        const problems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(problems);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching problems.', error: error.message });
    }
});

app.get('/api/contests/:contestId', verifyToken, async (req, res) => {
    try {
        const { contestId } = req.params;
        const contestDoc = await db.collection('contests').doc(contestId).get();
        if (!contestDoc.exists) {
            return res.status(404).json({ message: 'Contest not found.' });
        }
        res.status(200).json({ id: contestDoc.id, ...contestDoc.data() });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching contest details.', error: error.message });
    }
});

app.get('/api/problems/:problemId', verifyToken, async (req, res) => {
    try {
        const { problemId } = req.params;
        const problemRef = db.collection('problems').doc(problemId);
        const doc = await problemRef.get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Problem not found.' });
        }
        res.status(200).json({ id: doc.id, ...doc.data() });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching problem details.', error: error.message });
    }
});


app.post('/api/contests/:contestId/finalize', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { contestId } = req.params;

        // --- LEADERBOARD CALCULATION (This is your existing, correct logic) ---
        const contestDoc = await db.collection('contests').doc(contestId).get();
        if (!contestDoc.exists) {
            return res.status(404).json({ message: "Contest not found" });
        }
        const contestData = contestDoc.data();
        const contestStartTime = contestData.startTime.toDate();
        
        const submissionsSnapshot = await db.collection('submissions').where('contestId', '==', contestId).orderBy('submittedAt', 'asc').get();
        const problemsSnapshot = await db.collection('problems').where('contestId', '==', contestId).get();
        const problems = problemsSnapshot.docs.map(doc => ({ id: doc.id, points: doc.data().points || 0 }));
        const problemPointsMap = new Map(problems.map(p => [p.id, p.points]));
        
        const userStats = {};
        if (!submissionsSnapshot.empty) {
            for (const doc of submissionsSnapshot.docs) {
                const sub = doc.data();
                const userId = sub.userId;
                if (!userStats[userId]) {
                    const userDoc = await db.collection('users').doc(userId).get();
                    userStats[userId] = { userId, userName: userDoc.data()?.name || 'Unknown', score: 0, finishTime: 0, problemDetails: {} };
                }
                if (!userStats[userId].problemDetails[sub.problemId]) {
                    userStats[userId].problemDetails[sub.problemId] = { attempts: 0, solved: false, solveTime: 0, penalty: 0 };
                }
                const problemStat = userStats[userId].problemDetails[sub.problemId];
                if (problemStat.solved) continue;
                problemStat.attempts += 1;
                if (sub.status === 'Accepted') {
                    problemStat.solved = true;
                    const solveTimeMillis = sub.submittedAt.toDate() - contestStartTime;
                    problemStat.solveTime = Math.floor(solveTimeMillis / 1000);
                    problemStat.penalty = (problemStat.attempts - 1) * 5 * 60;
                    userStats[userId].score += (problemPointsMap.get(sub.problemId) || 0);
                    userStats[userId].finishTime += (problemStat.solveTime + problemStat.penalty);
                }
            }
        }
        
        let leaderboard = Object.values(userStats);
        leaderboard.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.finishTime - b.finishTime;
        });
        leaderboard = leaderboard.map((entry, index) => ({ ...entry, rank: index + 1 }));

        // --- NEW: GLOBAL RATING UPDATE LOGIC ---
        const K_FACTOR = 32;
        const batch = db.batch(); // Use a batch for efficient Firestore writes

        // Fetch all participant ratings at once to reduce reads inside the loop
        const participantIds = leaderboard.map(p => p.userId);
        const userDocs = participantIds.length > 0 ? await db.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', participantIds).get() : [];
        const ratingsMap = new Map();
        userDocs.forEach(doc => {
            ratingsMap.set(doc.id, doc.data().rating || 1500);
        });

        for (const participant of leaderboard) {
            const userRef = db.collection('users').doc(participant.userId);
            const currentRating = ratingsMap.get(participant.userId) || 1500;

            let ratingChange = 0;
            for (const opponent of leaderboard) {
                if (participant.userId === opponent.userId) continue;
                
                const opponentRating = ratingsMap.get(opponent.userId) || 1500;
                const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - currentRating) / 400));
                let actualScore = (participant.rank < opponent.rank) ? 1 : (participant.rank > opponent.rank) ? 0 : 0.5;
                ratingChange += K_FACTOR * (actualScore - expectedScore);
            }
            
            const newRating = Math.round(currentRating + ratingChange);
            batch.update(userRef, { rating: newRating });

            // Save this change to a history collection
            const ratingChangeRef = db.collection('ratingChanges').doc();
            batch.set(ratingChangeRef, {
                userId: participant.userId,
                contestId: contestId,
                contestName: contestData.title,
                changeDate: contestData.endTime,
                oldRating: currentRating,
                newRating: newRating,
                rank: participant.rank
            });
        }
        
        // Save the final leaderboard to the contest document
        batch.update(db.collection('contests').doc(contestId), {
            finalLeaderboard: leaderboard,
            isFinalized: true
        });

        await batch.commit();

        res.status(200).json({ message: 'Leaderboard finalized and ratings updated successfully.' });

    } catch (error) {
        console.error("Error finalizing leaderboard:", error);
        res.status(500).json({ message: 'Error finalizing leaderboard.', error: error.message });
    }
});


// --- CODE EXECUTION & SUBMISSION ROUTES ---
function getLanguageId(language) {
    switch (language) {
        case 'javascript': return 93;
        case 'python': return 71;
        case 'java': return 62;
        case 'cpp': return 54;
        default: return null;
    }
}


const executeCode = async (language, code, input) => {
    const language_id = getLanguageId(language);
    if (!language_id) throw new Error('Unsupported language');

    const options = {
        method: 'POST',
        url: 'https://judge0-ce.p.rapidapi.com/submissions',
        params: { base64_encoded: 'false', fields: '*' },
        headers: {
            'content-type': 'application/json',
            'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
        },
        data: {
            language_id: language_id,
            source_code: code,
            stdin: input
        }
    };
    
    try {
        const response = await axios.request(options);
        const token = response.data.token;

        let result;
        while (true) {
            const resultResponse = await axios.request({
                method: 'GET',
                url: `https://judge0-ce.p.rapidapi.com/submissions/${token}`,
                params: { base64_encoded: 'false', fields: '*' },
                headers: {
                    'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
                    'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
                }
            });
            const statusId = resultResponse.data.status.id;
            if (statusId > 2) {
                result = resultResponse.data;
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        return result;
    } catch (error) {
        console.error("!!! AXIOS ERROR - FAILED TO EXECUTE CODE !!!");
        if (error.response) {
            console.error("Response Data:", error.response.data);
            console.error("Response Status:", error.response.status);
        } else {
            console.error("Error Message:", error.message);
        }
        throw error;
    }
};


app.post('/api/execute/run', verifyToken, async (req, res) => {
    const { language, code, input } = req.body;
    try {
        const result = await executeCode(language, code, input);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error executing code.' });
    }
});


app.post('/api/execute/submit', verifyToken, async (req, res) => {
    const { language, code, problemId } = req.body;
    const userId = req.user.uid;

    try {
        if (!code || code.trim() === '' || code.trim() === '// Your code here') {
            return res.status(400).json({ message: 'Submission cannot be empty.' });
        }

        const problemDoc = await db.collection('problems').doc(problemId).get();
        if (!problemDoc.exists) {
            return res.status(404).json({ message: 'Problem not found.' });
        }

        const { testCases, contestId } = problemDoc.data();

        //  Contest timing check
        const contestDoc = await db.collection('contests').doc(contestId).get();
        if (!contestDoc.exists) {
            return res.status(404).json({ message: 'Contest not found.' });
        }

        const { startTime, endTime } = contestDoc.data();
        const now = admin.firestore.Timestamp.now();
        const isContestActive = now.toMillis() >= startTime.toMillis() && now.toMillis() <= endTime.toMillis();

        
        let finalStatus = null;
        let finalMessage = '';
        let failedTestCase = null;
        let passedCount = 0;

        for (let i = 0; i < testCases.length; i++) {
            const tc = testCases[i];
            const result = await executeCode(language, code, tc.input);
            const output = result.stdout?.trim();

            if (result.status.id !== 3 || output !== tc.output.trim()) {
                finalStatus = result.status.description || 'Wrong Answer';
                finalMessage = `Failed on test case ${i + 1}.`;
                failedTestCase = {
                    input: tc.input,
                    expectedOutput: tc.output,
                    actualOutput: output || result.stderr || result.compile_output || 'No output'
                };
                break;
            } else {
                passedCount++;
            }
        }

        if (finalStatus === null) {
            finalStatus = 'Accepted';
            finalMessage = `All ${testCases.length} test cases passed!`;
        }

        //  Save only if contest is active
        if (isContestActive) {
            await db.collection('submissions').add({
                userId,
                problemId,
                contestId,
                code,
                language,
                status: finalStatus,
                submittedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        //  Always return evaluation result
        res.status(200).json({
            status: finalStatus,
            message: finalMessage,
            passedTestCases: passedCount,
            totalTestCases: testCases.length,
            failedTestCase,
            contestActive: isContestActive
        });

    } catch (error) {
        res.status(500).json({ message: 'Error submitting code.', error: error.message });
    }
});


app.post('/api/execute/practice', verifyToken, async (req, res) => {
    const { language, code, problemId } = req.body;

    try {
        if (!code || code.trim() === '' || code.trim() === '// Your code here') {
            return res.status(400).json({ message: 'Submission cannot be empty.' });
        }

        const problemDoc = await db.collection('problems').doc(problemId).get();
        if (!problemDoc.exists) {
            return res.status(404).json({ message: 'Problem not found.' });
        }
        const { testCases } = problemDoc.data();
        
        let finalStatus = null;
        let finalMessage = '';
        let failedTestCase = null;

        for (let i = 0; i < testCases.length; i++) {
            const tc = testCases[i];
            const result = await executeCode(language, code, tc.input);
            const output = result.stdout?.trim();

            if (result.status.id !== 3 || output !== tc.output.trim()) {
                finalStatus = result.status.description || 'Wrong Answer';
                finalMessage = `Failed on test case ${i + 1}.`;
                failedTestCase = {
                    input: tc.input,
                    expectedOutput: tc.output,
                    actualOutput: output || result.stderr || result.compile_output || 'No output'
                };
                break; 
            }
        }

        if (finalStatus === null) {
            finalStatus = 'Accepted';
            finalMessage = `All ${testCases.length} test cases passed!`;
        }
        
        // This response is the same, but we DO NOT save to the database.
        res.status(200).json({ status: finalStatus, message: finalMessage, failedTestCase });

    } catch (error) {
        res.status(500).json({ message: 'Error during practice execution.', error: error.message });
    }
});

// Endpoint to toggle a bookmark for a problem
app.post('/api/problems/:problemId/bookmark', verifyToken, async (req, res) => {
    try {
        const { problemId } = req.params;
        const userId = req.user.uid;
        
        // A bookmark's ID will be a combination of userId and problemId to ensure uniqueness
        const bookmarkId = `${userId}_${problemId}`;
        const bookmarkRef = db.collection('bookmarks').doc(bookmarkId);
        
        const doc = await bookmarkRef.get();
        
        if (doc.exists) {
            // If the bookmark exists, un-bookmark it (delete the document)
            await bookmarkRef.delete();
            res.status(200).json({ message: 'Bookmark removed.' });
        } else {
            // If it doesn't exist, create it
            await bookmarkRef.set({
                userId: userId,
                problemId: problemId,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            res.status(201).json({ message: 'Problem bookmarked.' });
        }
    } catch (error) {
        console.error("Error toggling bookmark:", error);
        res.status(500).json({ message: 'Error toggling bookmark.', error: error.message });
    }
});

// Endpoint to get a user's bookmarked problems
app.get('/api/users/marked-questions', verifyToken, async (req, res) => {
    try {
        const userId = req.user.uid;

        // 1. Find all bookmark documents for the current user
        const bookmarksSnapshot = await db.collection('bookmarks').where('userId', '==', userId).get();
        if (bookmarksSnapshot.empty) {
            return res.status(200).json([]); // No bookmarks found
        }

        // 2. Extract all the problem IDs from the bookmarks
        const problemIds = bookmarksSnapshot.docs.map(doc => doc.data().problemId);

        // 3. Fetch all the corresponding problems from the 'problems' collection
        if (problemIds.length > 0) {
            const problemsSnapshot = await db.collection('problems').where(admin.firestore.FieldPath.documentId(), 'in', problemIds).get();
            const markedQuestions = problemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            res.status(200).json(markedQuestions);
        } else {
            res.status(200).json([]);
        }
    } catch (error) {
        console.error("Error fetching marked questions:", error);
        res.status(500).json({ message: 'Error fetching marked questions.', error: error.message });
    }
});

// Endpoint to check the bookmark status of a single problem
app.get('/api/problems/:problemId/bookmark-status', verifyToken, async (req, res) => {
    try {
        const { problemId } = req.params;
        const userId = req.user.uid;
        const bookmarkId = `${userId}_${problemId}`;
        
        const bookmarkRef = db.collection('bookmarks').doc(bookmarkId);
        const doc = await bookmarkRef.get();
        
        res.status(200).json({ isBookmarked: doc.exists });
    } catch (error) {
        res.status(500).json({ message: 'Error checking bookmark status.' });
    }
});



// --- ADVANCED LEADERBOARD ROUTE ---
app.get('/api/contests/:contestId/leaderboard', verifyToken, async (req, res) => {
    try {
        const { contestId } = req.params;

        const contestDoc = await db.collection('contests').doc(contestId).get();
        if (!contestDoc.exists) {
            return res.status(404).json({ message: "Contest not found" });
        }
        const contestStartTime = contestDoc.data().startTime.toDate();

        const submissionsSnapshot = await db.collection('submissions')
            .where('contestId', '==', contestId)
            .orderBy('submittedAt', 'asc')
            .get();
            
        const problemsSnapshot = await db.collection('problems').where('contestId', '==', contestId).get();
        const problems = problemsSnapshot.docs.map(doc => ({ id: doc.id, title: doc.data().title, points: doc.data().points || 0 }));
        const problemPointsMap = new Map(problems.map(p => [p.id, p.points]));
        
        if (submissionsSnapshot.empty) {
            return res.status(200).json({ leaderboard: [], problems: [] });
        }

        const userStats = {};

        for (const doc of submissionsSnapshot.docs) {
            const sub = doc.data();
            const userId = sub.userId;

            if (!userStats[userId]) {
                const userDoc = await db.collection('users').doc(userId).get();
                userStats[userId] = {
                    userId: userId,
                    userName: userDoc.data()?.name || 'Unknown',
                    score: 0,
                    finishTime: 0,
                    problemDetails: {}
                };
            }
            
            if (!userStats[userId].problemDetails[sub.problemId]) {
                userStats[userId].problemDetails[sub.problemId] = {
                    attempts: 0,
                    solved: false,
                    solveTime: 0,
                    penalty: 0
                };
            }

            const problemStat = userStats[userId].problemDetails[sub.problemId];

            if (problemStat.solved) {
                continue; // Skip if already solved
            }

            // This is a new attempt on an unsolved problem
            problemStat.attempts += 1;

            if (sub.status === 'Accepted') {
                problemStat.solved = true;
                const solveTimeMillis = sub.submittedAt.toDate() - contestStartTime;
                problemStat.solveTime = Math.floor(solveTimeMillis / 1000);
                // Penalty is based on wrong attempts (total attempts - 1)
                problemStat.penalty = (problemStat.attempts - 1) * 5 * 60;
                
                userStats[userId].score += (problemPointsMap.get(sub.problemId) || 0);
                userStats[userId].finishTime += (problemStat.solveTime + problemStat.penalty);
            }
        }

        const leaderboard = Object.values(userStats);
        leaderboard.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.finishTime - b.finishTime;
        });

        res.status(200).json({ leaderboard, problems });

    } catch (error) {
        console.error("Error generating leaderboard:", error);
        res.status(500).json({ message: 'Error generating leaderboard.', error: error.message });
    }
});


// Endpoint for the student profile page
app.get('/api/users/profile', verifyToken, async (req, res) => {
    try {
        const userId = req.user.uid;

        // 1. Fetch all submissions for the user
        const submissionsSnapshot = await db.collection('submissions')
            .where('userId', '==', userId)
            .orderBy('submittedAt', 'asc') // Order by date for easier processing
            .get();

        if (submissionsSnapshot.empty) {
            return res.status(200).json({
                totalSubmissions: 0,
                uniqueProblemsSolved: 0,
                submissionAccuracy: 0,
                solvedByDifficulty: { Easy: 0, Medium: 0, Hard: 0 },
                activityData: [] // Return empty array for heatmap
            });
        }

        const submissions = submissionsSnapshot.docs.map(doc => doc.data());
        
        // 2. Calculate Activity Heatmap Data
        const activityDataMap = new Map();
        submissions.forEach(sub => {
            const date = sub.submittedAt.toDate().toISOString().split('T')[0]; // Get YYYY-MM-DD
            activityDataMap.set(date, (activityDataMap.get(date) || 0) + 1);
        });
        const activityData = Array.from(activityDataMap, ([date, count]) => ({ date, count }));

        // 3. Get unique problem IDs from accepted submissions
        const solvedProblemIds = [...new Set(
            submissions.filter(s => s.status === 'Accepted').map(s => s.problemId)
        )];

        // 4. Fetch the details for all solved problems
        const problems = {};
        if (solvedProblemIds.length > 0) {
            const problemsSnapshot = await db.collection('problems').where(admin.firestore.FieldPath.documentId(), 'in', solvedProblemIds).get();
            problemsSnapshot.forEach(doc => {
                problems[doc.id] = doc.data();
            });
        }

        // 5. Calculate other stats
        const totalSubmissions = submissions.length;
        const totalAcceptedSubmissions = submissions.filter(s => s.status === 'Accepted').length;
        const submissionAccuracy = totalSubmissions > 0 ? Math.round((totalAcceptedSubmissions / totalSubmissions) * 100) : 0;
        
        const solvedByDifficulty = { Easy: 0, Medium: 0, Hard: 0 };
        solvedProblemIds.forEach(problemId => {
            const difficulty = problems[problemId]?.difficulty;
            if (difficulty && solvedByDifficulty.hasOwnProperty(difficulty)) {
                solvedByDifficulty[difficulty]++;
            }
        });

        res.status(200).json({
            totalSubmissions,
            uniqueProblemsSolved: solvedProblemIds.length,
            submissionAccuracy,
            solvedByDifficulty,
            activityData // Send the new heatmap data
        });

    } catch (error) {
        console.error("Error fetching profile data:", error);
        res.status(500).json({ message: 'Error fetching profile data.', error: error.message });
    }
});


app.get('/api/users/contest-history', verifyToken, async (req, res) => {
    try {
        const userId = req.user.uid;

        // 1. Find all contests that have been finalized
        const contestsSnapshot = await db.collection('contests')
            .where('isFinalized', '==', true)
            .get();

        const history = [];
        contestsSnapshot.forEach(doc => {
            const contest = doc.data();
            // 2. Find the current user's entry in the saved leaderboard
            if (contest.finalLeaderboard) {
                const userEntry = contest.finalLeaderboard.find(entry => entry.userId === userId);

                // 3. If they participated, add their results to the history
                if (userEntry) {
                    history.push({
                        contestId: doc.id,
                        contestName: contest.title,
                        score: userEntry.score,
                        rank: userEntry.rank
                    });
                }
            }
        });

        res.status(200).json(history);

    } catch (error) {
        console.error("Error fetching contest history:", error);
        res.status(500).json({ message: 'Error fetching contest history.', error: error.message });
    }
});


app.get('/api/leaderboard', verifyToken, async (req, res) => {
    try {
        const usersSnapshot = await db.collection('users')
            .where('role', '==', 'student') // Only show students on the leaderboard
            .orderBy('rating', 'desc')
            .get();
            
        const mainLeaderboard = usersSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                userId: doc.id,
                userName: data.name,
                rating: data.rating || 1500
            };
        });

        res.status(200).json(mainLeaderboard);

    } catch (error) {
        console.error("Error fetching main leaderboard:", error);
        res.status(500).json({ message: 'Error fetching main leaderboard.', error: error.message });
    }
});


app.get('/api/users/rating-history', verifyToken, async (req, res) => {
    try {
        const userId = req.user.uid;

        const historySnapshot = await db.collection('ratingChanges')
            .where('userId', '==', userId)
            .orderBy('changeDate', 'asc') // Order chronologically
            .get();
        
        if (historySnapshot.empty) {
            return res.status(200).json([]);
        }

        const ratingHistory = historySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                contestName: data.contestName,
                // Format the date for the chart
                date: data.changeDate.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                rating: data.newRating
            };
        });

        res.status(200).json(ratingHistory);

    } catch (error) {
        console.error("Error fetching rating history:", error);
        res.status(500).json({ message: 'Error fetching rating history.', error: error.message });
    }
});


app.post('/api/sessions/add', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { title, meetingLink, startTime, endTime } = req.body; // ADD startTime and endTime
        if (!title || !meetingLink || !startTime || !endTime) { // ADD check for times
            return res.status(400).json({ message: 'All fields are required.' });
        }

        const newSession = {
            title,
            meetingLink,
            startTime: admin.firestore.Timestamp.fromDate(new Date(startTime)),
            endTime: admin.firestore.Timestamp.fromDate(new Date(endTime)),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: req.user.uid
        };

        await db.collection('liveSessions').add(newSession);
        res.status(201).json({ message: 'Live session created successfully.' });

    } catch (error) {
        console.error("Error creating live session:", error);
        res.status(500).json({ message: 'Error creating live session.', error: error.message });
    }
});


app.get('/api/sessions', verifyToken, async (req, res) => {
    try {
    const snapshot = await db.collection('liveSessions').get();
    
    // 1. Categorize sessions into three lists
    const ongoing = [];
    const upcoming = [];
    const finished = [];
    const now = new Date();

    snapshot.forEach(doc => {
        const session = { id: doc.id, ...doc.data() };
        const startTime = session.startTime.toDate();
        const endTime = session.endTime.toDate();

        if (now >= startTime && now < endTime) {
            ongoing.push(session);
        } else if (now < startTime) {
            upcoming.push(session);
        } else {
            finished.push(session);
        }
    });

    // 2. Sort each category individually
    // Ongoing and Upcoming should show the soonest first
    ongoing.sort((a, b) => a.startTime.seconds - b.startTime.seconds);
    upcoming.sort((a, b) => a.startTime.seconds - b.startTime.seconds);
    // Finished should show the most recently ended first
    finished.sort((a, b) => b.endTime.seconds - a.endTime.seconds);

    // 3. Combine the lists in the correct order
    const sortedSessions = [...ongoing, ...upcoming, ...finished];
    
    // 4. Convert timestamps to strings before sending
    const finalSessions = sortedSessions.map(session => ({
        ...session,
        startTime: session.startTime.toDate(),
        endTime: session.endTime.toDate(),
        createdAt: session.createdAt.toDate(),
    }));

    res.status(200).json(finalSessions);

} catch (error) {
    console.error("Error fetching live sessions:", error);
    res.status(500).json({ message: 'Error fetching live sessions.', error: error.message });
}
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});