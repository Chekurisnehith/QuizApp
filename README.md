Quiz App
A full-stack quiz application built with React frontend and Node.js/Express backend with SQLite database.

Features
User registration and authentication (JWT)

10-question quiz with multiple-choice questions

Real-time answer validation

Score tracking and leaderboard

PDF certificate generation

Responsive design with modern UI

Tech Stack
Frontend
React.js

React Router for navigation

Inline CSS styling

Backend
Node.js

Express.js

SQLite database

JWT authentication

bcrypt for password hashing

PDFKit for certificate generation

Project Structure
text
Quizapp/
├── backend/
│   ├── db.sqlite          # SQLite database
│   └── server.js          # Express server
└── quiz-app/
    └── src/
        ├── App.js         # Main app component with routing
        ├── index.js       # React app entry point
        ├── Register.js    # User registration component
        ├── Login.js       # User login component
        └── Quiz.js        # Quiz component with results
Setup Instructions
Prerequisites
Node.js (v14 or higher)

npm or yarn

Backend Setup
Navigate to the backend directory:

bash
cd C:\Users\snehi\OneDrive\Desktop\Quizapp\backend
Install backend dependencies:

bash
npm install express sqlite3 bcrypt jsonwebtoken body-parser cors pdfkit
Start the backend server:

bash
node server.js
The server will run on http://localhost:4000

Frontend Setup
Open a new terminal and navigate to the frontend directory:

bash
cd C:\Users\snehi\OneDrive\Desktop\Quizapp\quiz-app
Install frontend dependencies:

bash
npm install react-router-dom
Start the React development server:

bash
npm start
The application will open in your browser at http://localhost:3000

Usage
Register a new account or login with existing credentials

Take the 10-question quiz

Get immediate feedback on each answer

View your final score and see if you passed (7+ correct answers)

Download a PDF certificate of completion

Check the leaderboard to see how you rank against other users

API Endpoints
POST /register - User registration

POST /login - User login

GET /quiz - Get quiz questions

POST /check-answer - Validate a single answer

POST /submit-quiz - Submit completed quiz

GET /leaderboard - Get leaderboard data

GET /certificate - Generate PDF certificate

Database Schema
Users Table
id (INTEGER PRIMARY KEY)

name (TEXT)

email (TEXT UNIQUE)

password (TEXT)

Results Table
id (INTEGER PRIMARY KEY)

userId (INTEGER FOREIGN KEY)

score (INTEGER)

total (INTEGER)

passed (INTEGER)

createdAt (TEXT)

Quiz Questions
The application includes 10 fixed questions covering general knowledge, math, and programming topics.

Security Features
Password hashing with bcrypt

JWT authentication for API endpoints

SQL injection prevention with parameterized queries

CORS configuration for frontend-backend communication

Customization
Modify the SECRET constant in server.js for production

Change the quiz questions in the QUESTIONS array

Adjust the passing score (currently 7/10)

Customize the PDF certificate design

