const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const path = require('path');

const SECRET = "supersecret_jwt_key_change_in_prod";
const PORT = 4000;

const app = express();
app.use(bodyParser.json());
app.use(cors({
  origin: ['http://localhost:3000']
}));

// --- SQLite setup
const DB_PATH = path.join(__dirname, 'db.sqlite');
const db = new sqlite3.Database(DB_PATH);
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    score INTEGER,
    total INTEGER,
    passed INTEGER,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id)
  )`);
});

// --- Hardcoded quiz questions
const QUESTIONS = [
  { id: 1, q: "What is the capital of France?", options: ["Paris","London","Rome","Berlin"], a: 0 },
  { id: 2, q: "Which planet is known as the Red Planet?", options: ["Earth","Mars","Venus","Jupiter"], a: 1 },
  { id: 3, q: "2 + 2 * 2 = ?", options: ["6","8","4","2"], a: 0 },
  { id: 4, q: "Which language runs in a browser?", options: ["Python","C++","JavaScript","Java"], a: 2 },
  { id: 5, q: "Who wrote 'Romeo and Juliet'?", options: ["Shakespeare","Dickens","Tolkien","Austen"], a: 0 },
  { id: 6, q: "H2O is the chemical formula for?", options: ["Salt","Oxygen","Water","Hydrogen"], a: 2 },
  { id: 7, q: "Which animal is known as the King of the Jungle?", options: ["Tiger","Elephant","Lion","Giraffe"], a: 2 },
  { id: 8, q: "What does CSS stand for?", options: ["Cascading Style Sheets","Computer Style Sheets","Colorful Style System","Creative Style Sheets"], a: 0 },
  { id: 9, q: "Which is a JavaScript framework?", options: ["Django","Flask","React","Laravel"], a: 2 },
  { id: 10, q: "What is 10 squared?", options: ["100","20","1000","10"], a: 0 }
];

// --- Helpers
function generateToken(user) {
  return jwt.sign({ id: user.id, name: user.name, email: user.email }, SECRET, { expiresIn: '7d' });
}
function authenticateToken(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ error: 'No token' });
  const token = auth.split(' ')[1];
  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// --- Routes

// Register
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });

  try {
    const hashed = await bcrypt.hash(password, 10);
    db.run(`INSERT INTO users (name, email, password) VALUES (?,?,?)`, [name, email, hashed], function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') return res.status(400).json({ error: 'Email already in use' });
        return res.status(500).json({ error: 'DB error' });
      }
      const user = { id: this.lastID, name, email };
      const token = generateToken(user);
      res.json({ message: 'Registered', token, user });
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email, password required' });

  db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, row) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!row) return res.status(400).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, row.password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });

    const user = { id: row.id, name: row.name, email: row.email };
    const token = generateToken(user);
    res.json({ message: 'Login successful', token, user });
  });
});

// Get quiz
app.get('/quiz', authenticateToken, (req, res) => {
  const quizNoAnswers = QUESTIONS.map(({ id, q, options }) => ({ id, q, options }));
  res.json({ questions: quizNoAnswers });
});

// Check answer
app.post('/check-answer', authenticateToken, (req, res) => {
  const { questionId, selectedIndex } = req.body || {};
  const question = QUESTIONS.find(x => x.id === questionId);
  if (!question) return res.status(404).json({ error: 'Question not found' });
  res.json({ correct: question.a === selectedIndex });
});

// Submit quiz
app.post('/submit-quiz', authenticateToken, (req, res) => {
  const { answers } = req.body || {}; 
  if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers array required' });

  let correctCount = 0;
  for (const ans of answers) {
    const q = QUESTIONS.find(x => x.id === ans.questionId);
    if (q && q.a === ans.selectedIndex) correctCount++;
  }
  const passed = correctCount >= 7;

  // Save result
  db.run(
    `INSERT INTO results (userId, score, total, passed) VALUES (?,?,?,?)`,
    [req.user.id, correctCount, QUESTIONS.length, passed ? 1 : 0],
    (err) => { if (err) console.error("DB save error", err); }
  );

  res.json({ total: QUESTIONS.length, correct: correctCount, passed });
});

// Leaderboard (best score per user)
app.get('/leaderboard', authenticateToken, (req, res) => {
  const query = `
    SELECT u.name, MAX(r.score) as bestScore, r.total
    FROM results r
    JOIN users u ON r.userId = u.id
    GROUP BY u.id
    ORDER BY bestScore DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ leaderboard: rows });
  });
});

// Certificate
app.get('/certificate', authenticateToken, (req, res) => {
  const name = req.query.name || req.user.name || "Candidate";
  const result = (req.query.result || 'fail').toLowerCase() === 'pass' ? 'PASS' : 'FAIL';
  const score = req.query.score || '';

  res.setHeader('Content-disposition', `attachment; filename=${name.replace(/\s+/g,'_')}_certificate.pdf`);
  res.setHeader('Content-type', 'application/pdf');

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(res);

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  doc.rect(0, 0, pageWidth, pageHeight).fill('#fdfdfd');
  doc.fillColor('black');
  doc.lineWidth(5).strokeColor('#003366')
    .rect(20, 20, pageWidth - 40, pageHeight - 40).stroke();

  doc.fillColor('#003366').fontSize(32).font('Helvetica-Bold')
    .text('Certificate of Achievement', { align: 'center', underline: true });
  
  doc.moveDown(2);
  doc.fillColor('black').fontSize(16).font('Helvetica')
    .text('This certificate is proudly presented to', { align: 'center' });

  doc.moveDown(1);
  doc.fontSize(26).font('Helvetica-Bold')
    .fillColor(result === 'PASS' ? '#27ae60' : '#c0392b')
    .text(name, { align: 'center' });

  doc.moveDown(1);
  doc.fontSize(16).fillColor('black').font('Helvetica')
    .text(
      result === 'PASS'
        ? `For successfully completing the quiz with a score of ${score}.`
        : `For attempting the quiz. Better luck next time!`,
      { align: 'center' }
    );

  doc.moveDown(4);
  doc.fontSize(12).fillColor('gray')
    .text(`Date: ${new Date().toLocaleDateString()}`, 50, pageHeight - 100);
  doc.fontSize(12).fillColor('black')
    .text('Authorized Signature', pageWidth - 200, pageHeight - 100);

  doc.end();
});

// Server test
app.get('/', (req, res) => res.send('Quiz backend running'));
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
