# Code Your World

A lightweight project-based learning platform built for a coding academy or bootcamp. Students can unlock projects, submit work, and receive peer review feedback, while admins manage the live learning track and project briefs.

This project is intentionally simple and self-contained: it runs with a single Node.js server, uses a JSON file for persistence, and keeps the frontend in plain HTML, CSS, and JavaScript.

## Why this project exists

Many learning platforms are too large or too heavy for a simple classroom demo. Code Your World focuses on the core mechanics that matter most:

- role-based access for students and admins
- project unlocking and progression
- repository submission flow
- peer review assignment and scoring
- admin management of the course track

It is designed to feel like a compact internal LMS or project review dashboard, without the complexity of a production-grade platform.

## Features

### Student experience

- Sign in with an email and password
- View a project track with progression state
- Unlock projects in sequence based on prior success
- Submit a Git repository URL for a project
- Receive two peer review assignments for each submission
- Review a peer's work using a secret audit code, score, and feedback
- See whether the project is marked as passed or failed

### Admin experience

- Sign in as an administrator
- Add new project briefs with title, category, order, and markdown details
- Remove projects from the active student track
- Review live project counts by category

### Backend behavior

- Cookie-based sessions for local auth
- Password hashing using Node's `scrypt` implementation
- JSON file persistence in `data/db.json`
- Optional Supabase auth support for browser-based auth flows
- Simple server-side authorization checks for protected endpoints

## Tech stack

- Node.js
- Native Node HTTP server
- Plain HTML, CSS, and JavaScript
- JSON for data persistence
- No frontend framework
- No external database required

## Project structure

```text
.
├── app.js              # Frontend logic and UI behavior
├── index.html          # App layout and modal structure
├── modern.css          # Modern visual styling
├── overrides.css       # Additional design overrides
├── styles.css          # Base styles
├── server.mjs          # HTTP server and API logic
├── data/
│   └── db.json         # Seed data and runtime persistence
├── README.md           # Project documentation
└── .gitignore          # Git ignore rules (if present in your repo)
```

## How the app works

### Project progression

Projects are sorted by category and order. Students cannot unlock a project unless the previous project in the sequence has already been passed.

### Submission flow

When a student submits a project:

1. The submission is created in the database
2. Two other student accounts are selected as peer auditors
3. Each auditor receives a unique audit code
4. The submission enters a pending review state

### Audit flow

Each peer auditor reviews the submission by entering:

- the audit code
- a score from 0 to 5
- written feedback

Once both reviewers complete their review, the project is marked as:

- passed if both scores are at least 3
- failed otherwise

## Getting started

### Prerequisites

- Node.js 18 or newer
- A modern browser
- Access to `localhost` on port `4173`

### Run the app locally

From the project root, start the server:

```bash
node server.mjs
```

Then open:

```text
http://localhost:4173
```

## Demo accounts

The app seeds demo data automatically if `data/db.json` does not exist yet.

### Student

```text
Email: alex@cyw.dev
Password: student123
```

### Admin

```text
Email: admin@cyw.dev
Password: admin123
```

## Local development notes

This project is intentionally minimal, so there is no build step or dependency installation needed. If you are working on the frontend, the browser will automatically reflect changes to the static files after refresh. For backend changes, restart the Node process.

## API overview

The server exposes a small JSON API for the frontend.

### Authentication

#### POST `/api/login`

Logs in a user with email and password.

Example request:

```json
{
  "email": "alex@cyw.dev",
  "password": "student123"
}
```

#### POST `/api/logout`

Logs out the current user by clearing the session cookie.

### Dashboard

#### GET `/api/dashboard`

Returns the authenticated user's data, project unlock state, and any pending audit assignments.

### Project submissions

#### POST `/api/projects/:projectId/submit`

Submits a repository URL for an unlocked project.

Example request:

```json
{
  "repository": "https://github.com/your-name/project"
}
```

### Audits

#### POST `/api/audits/:auditId`

Submits a peer review for a given audit assignment.

Example request:

```json
{
  "code": "CYW-AB12CD",
  "score": 4,
  "feedback": "Good structure and clean implementation. Add better validation for edge cases."
}
```

### Admin actions

#### POST `/api/admin/projects`

Creates a new project brief and adds it to the active track.

#### DELETE `/api/admin/projects/:projectId`

Removes a project from the live student track.

## Configuration

The server supports optional Supabase authentication variables if you want to plug in a real auth provider:

```bash
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key
```

If these are not set, the app falls back to the built-in local cookie-based login flow.

## Security and assumptions

This app is a demo and is not intended to be production-ready. Some current assumptions include:

- session data is stored in memory only
- the database is a local JSON file, not a managed database
- validation is intentionally simple and lightweight
- admin and student roles are handled directly in the app logic

## Good fit for this project

This is a strong fit for:

- classroom demos
- coding bootcamp exercises
- learning workflow prototypes
- internal review systems for student projects

## Future ideas

Possible next improvements include:

- richer project metadata and rubric scoring
- admin analytics dashboard
- email notifications for review assignments
- better validation and pagination
- proper database storage and Docker-based deployment

## License

This project is intended for educational and demo use. Add an appropriate license if you plan to share or deploy it publicly.

## Contributing

If you want to improve the app:

1. Fork the project
2. Create a feature branch
3. Make your changes
4. Test the flow locally
5. Open a pull request with a clear summary

## Summary

Code Your World is a compact and practical example of how a project-based learning platform can work without a heavy framework. It combines authentication, progression, submissions, peer review, and admin management into a single, easy-to-run app.

If you want a cleaner project pitch, a more visual landing section, or a version tailored for GitHub showcase purposes, I can help you refine it further.
