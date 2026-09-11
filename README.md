# Code Your World

Code Your World is a lightweight web application for managing a project-based learning track. It lets students sign in, unlock and submit projects, and participate in peer review by auditing other students' submissions. Administrators can add project briefs and remove active projects from the live student track.

This project is intentionally simple and self-contained: it uses a Node.js HTTP server, plain JavaScript on the frontend, and a JSON file for persistence. It is designed to feel like a compact internal platform for a coding academy or bootcamp.

---

## Overview

The application supports a basic learning flow:

- Students authenticate with an email/password form.
- A dashboard shows the current project track and overall progress.
- Projects are organized by category and unlock order.
- Students submit a Git repository URL for a project.
- Each submission is assigned to two peer auditors.
- Auditors review the submission using a secret audit code, a score, and feedback.
- Once both reviews are complete, the project is marked as passed or failed.
- Administrators can manage the live project list directly from the dashboard.

This is not a production-scale LMS. It is a practical demo built to model the mechanics of a project review workflow with persistence and role-based access.

---

## Features

### Authentication and user roles

The application supports two roles:

- Student: can view their dashboard, unlock projects, submit work, and complete peer audits.
- Admin: can add project briefs and remove active projects from the track.

Authentication is cookie-based and session state is stored in memory on the server. Passwords are hashed using Node's `scrypt` implementation before being saved.

### Project progression

Projects are stored in the database with metadata such as:

- unique ID
- title
- category
- order
- active/inactive flag
- markdown brief

Students cannot access a project unless the previous project in the sequence has been passed. This gating logic enforces track progression.

### Submission and peer-audit flow

A student can submit a repository URL for a currently unlocked project. On submission:

- the submission is inserted into the database
- two student auditors are randomly selected from other students
- each auditor receives their own unique audit code
- each assignment is marked as pending

An auditor reviews the submission by providing:

- the audit code
- a score from 0 to 5
- written feedback

When both assigned auditors finish, the project is automatically set to passed if both scores are at least 3, otherwise failed.

### Admin controls

Admin users see an admin panel that includes:

- a summary of active projects by category
- a list of current live projects
- a button to remove a project from the student track

Admins can also upload new project briefs by submitting a title, category, order number, and markdown description.

---

## Tech Stack

This project uses a very minimal stack:

- Node.js
- Native Node HTTP server
- Plain HTML, CSS, and JavaScript
- JSON file persistence
- No frontend framework
- No external database or package installation required

The backend is implemented in [server.mjs](server.mjs), and the frontend logic is in [app.js](app.js). Styling is in [styles.css](styles.css) and [overrides.css](overrides.css).

---

## Project Structure

```text
.
├── app.js                # Frontend logic for rendering dashboard and handling interactions
├── index.html            # Main HTML shell for the app layout and modal dialogs
├── server.mjs            # Node HTTP server and all API logic
├── styles.css            # Core visual design for the app
├── overrides.css         # Additional styling tweaks
├── data/
│   └── db.json           # Seeded project, user, submission, and audit data
├── package.json          # Not present in this repo; app runs directly with Node
└── README.md             # Project documentation
```

---

## Getting Started

### Prerequisites

You will need:

- Node.js 18 or newer
- A modern browser
- Access to localhost on port 4173

### Run the app

From the project root, start the server:

```bash
node server.mjs
```

Then open the app in a browser at:

```text
http://localhost:4173
```

### Default credentials

The application seeds demo users automatically if no database file exists yet.

Student account:

```text
Email: alex@cyw.dev
Password: student123
```

Admin account:

```text
Email: admin@cyw.dev
Password: admin123
```

---

## How the App Works

### Student experience

1. Sign in with a seeded student account.
2. View the overview dashboard showing progress, current project, and audit queue.
3. Click a project in the track to open its assignment brief.
4. Submit a repository URL to enter the audit process.
5. Wait for the audit pool to review the submission.
6. When assigned as an auditor, review a peer project by entering the audit code and feedback.
7. Track progress updates based on passed or failed submission outcomes.

### Admin experience

1. Sign in as the seeded admin account.
2. View the admin summary and list of live projects.
3. Add a project from the admin panel with a title, category, order, and markdown brief.
4. Remove projects that should no longer appear on the student track.

---

## API Overview

The server exposes a small JSON API for the frontend.

### Authentication endpoints

#### POST /api/login

Authenticates a user using email and password.

Request body:

```json
{
  "email": "alex@cyw.dev",
  "password": "student123"
}
```

Response:

```json
{
  "user": {
    "id": "...",
    "name": "Alex Morgan",
    "email": "alex@cyw.dev",
    "role": "student"
  }
}
```

#### POST /api/logout

Invalidates the current session.

### Dashboard and data endpoints

#### GET /api/dashboard

Returns the current user, their project state, and current audit assignments.

Response includes:

- user data
- projects with unlocked status
- submission information for each project
- pending audit assignments

### Project submission endpoints

#### POST /api/projects/:projectId/submit

Allows a student to submit a repository URL for an unlocked project.

Example:

```json
{
  "repository": "https://github.com/you/project"
}
```

This creates a submission and assigns two peer auditors.

### Audit endpoints

#### POST /api/audits/:auditId

Finalizes an auditor's review for a specific assigned audit.

Request body:

```json
{
  "code": "CYW-A3AE37",
  "score": 4,
  "feedback": "The project is solid. The main improvement would be adding more test coverage."
}
```

The server validates:

- the audit code matches the original assignment
- the score is within the valid range
- feedback is non-empty

If both auditors complete their reviews, the submission status is updated to passed or failed based on the average or threshold logic used by the app.

### Admin endpoints

#### POST /api/admin/projects

Creates a new project for the student track.

Required fields:

- title
- category
- order
- markdown

#### DELETE /api/admin/projects/:projectId

Deactivates a project without deleting it permanently.

---

## Data Model

The application stores data in a single JSON file at [data/db.json](data/db.json). The structure is intentionally compact and uses a few central collections:

### Users

```json
{
  "id": "...",
  "name": "Alex Morgan",
  "email": "alex@cyw.dev",
  "password": "salt:hashed-password",
  "role": "student"
}
```

### Projects

```json
{
  "id": "...",
  "title": "GO-REFRESH",
  "category": "IMPERATIVE",
  "order": 1,
  "markdown": "# Project brief",
  "active": true
}
```

### Submissions

```json
{
  "id": "...",
  "projectId": "...",
  "userId": "...",
  "repository": "https://github.com/you/project",
  "status": "in_audit",
  "createdAt": "2026-09-11T00:00:00.000Z"
}
```

### Audit assignments

```json
{
  "id": "...",
  "submissionId": "...",
  "auditorId": "...",
  "code": "CYW-A3AE37",
  "status": "pending"
}
```

### Audits

```json
{
  "id": "...",
  "assignmentId": "...",
  "score": 4,
  "feedback": "...",
  "createdAt": "..."
}
```

---

## Security Notes

This is a learning/demo project and is intentionally lightweight, not hardened for production use. Some notes:

- Sessions are stored in memory and are lost when the server restarts.
- Cookies are created with `HttpOnly` and `SameSite=Strict`.
- Passwords are hashed with `scrypt`.
- Input is validated on the server before accepting submissions and audits.

If you plan to extend this project for real use, the next steps would be:

- move storage to a real database
- add proper session persistence
- implement role-based UI restrictions more strictly
- add CSRF protection
- add HTTPS and secure headers

---

## Design Notes

The frontend is intentionally simple and does not use a framework. The app uses:

- a single HTML entry page
- DOM updates driven by JavaScript
- modal windows for project briefs and audits
- toast notifications for action feedback
- CSS-based cards, panels, and stat blocks

This makes it easy to explore or modify without understanding a larger build toolchain.

---

## Extending the Project

Possible enhancements include:

- adding deadline tracking for projects
- allowing multiple project categories and custom ordering logic
- showing detailed audit summaries and submission history
- adding admin analytics or student leaderboard screens
- adding search, filtering, or sorting to the project list
- replacing JSON storage with SQLite or PostgreSQL
- adding test automation around the API endpoints

Because the server logic is centralized and the front end is plain JavaScript, adding features is straightforward.

---

## Troubleshooting

### The app does not load

Make sure the server started successfully:

```bash
node server.mjs
```

If it crashes, confirm you are using a supported Node.js version and that you are in the project root directory.

### Login fails

Use one of the seeded credentials from the default list above. If the database file has been modified, delete the auto-generated file and restart the app to restore the seed data.

### The browser cannot connect

Verify that the app is running on port 4173 and that your browser is pointing to:

```text
http://localhost:4173
```

### Projects are not appearing or unlocking

The project unlock logic depends on previous project completion. A student must pass the prior project in the sequence before the next one becomes available.

---

## Development Notes

This project is a useful reference for building small, role-based educational apps without a framework. It demonstrates:

- session-based authentication
- routing in a single Node HTTP server
- state synchronization between frontend and backend
- project gate logic
- peer-review workflows
- storing structured app data in JSON

---

## License

This project does not currently declare a license file. If you plan to reuse or distribute it, add a license agreement that matches your intended usage.

---

## Summary

Code Your World is a compact, practical example of a project-based learning platform. It covers the core flow of authentication, project progression, submission, peer review, and admin management while staying easy to understand and modify.

It is ideal for learning how to build a small workflow-driven web application with a custom backend and a static frontend without introducing heavy framework complexity.
