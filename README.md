# ScholarConf – Academic Conference Management Toolkit

ScholarConf is a full-stack, enterprise-grade Academic Conference Management System inspired by Microsoft CMT. It provides end-to-end management for academic research conferences, including conference lifecycle administration, structured multi-reviewer peer evaluation, dynamic track routing, role-based workflows, manuscript uploads, and automated transactional email notifications.

---

## 🌐 Live Production Deployments

| Component | Provider | Live URL | Status |
| :--- | :--- | :--- | :--- |
| **Frontend Application** | **Vercel** | [https://scholar-conf.vercel.app](https://scholar-conf.vercel.app) | 🟢 Live |
| **Backend REST API** | **Render** | [https://scholarconf.onrender.com](https://scholarconf.onrender.com) | 🟢 Live |
| **API Health Check** | **Render** | [https://scholarconf.onrender.com/api/health](https://scholarconf.onrender.com/api/health) | 🟢 Online |
| **Email Service** | **Brevo HTTPS API** | `scholarconf.moyukh@gmail.com` | 🟢 Active (Sends to ANY email) |

---

## 🔑 Pre-Seeded Accounts for Testing All 4 Roles

The following accounts are registered in Firebase Authentication & Cloud Firestore and linked to sample prototype data in **ICML 2026**:

| Role | Email | Password | Console Destination |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@scholarconf.com` | `Admin123!` | **Super Admin Console** (`/super-admin`) |
| **Program Chair** | `chair@scholarconf.com` | `Password123!` | **Chair Console** (clicking *ICML 2026*) |
| **Reviewer** | `reviewer@scholarconf.com` | `Password123!` | **Reviewer Console** (clicking *ICML 2026*) |
| **Author** | `author@scholarconf.com` | `Password123!` | **Author Console** (clicking *ICML 2026*) |

> *Note: You can also register any new personal email or sign in with **Google Sign-In**.*

---

## 🚀 Key Features & Implemented Workflows

1. **Public Landing Page (`/`)**: Hero section, Program Chair / Author / Reviewer feature cards, call-to-actions, and authentication portals.
2. **Authentication (`/login`)**: Email/Password login, Signup, Password Reset with automated email notices, and Google OAuth Sign-In.
3. **Conference Dashboard (`/dashboard`)**: Active approved conferences listing, real-time unread notification bell, and **automatic conference-specific role routing** (routes Chairs to Chair Console, Reviewers to Reviewer Console, Authors to Author Console).
4. **Create Conference Form (`/create-conference`)**: Dynamic Tracks manager (`+ Add Track` / Remove), organization name, slug, and submission for Super Admin approval.
5. **Super Admin Console (`/super-admin`)**: Platform overview metric cards, status tabs (`Pending`, `Approved`, `Rejected`, `Archived`), search & filter, and single-click approval/rejection actions.
6. **Chair Console (`/conference/:id/chair`)**: 
   - Real-time submission tracking across conference tracks.
   - **Assign Reviewers Modal**: Assign multiple reviewers per paper with automatic state transitions (`Reviewer to be Assigned` $\rightarrow$ `Under Review` $\rightarrow$ `Reviewed`).
   - Automated reviewer invitation emails dispatched via Gmail SMTP.
   - **Final Decision Publishing**: Accept or Reject paper with official decision letter emails to authors.
7. **Reviewer Console (`/conference/:id/reviewer`)**: Restricted strictly to papers assigned to the logged-in reviewer. Features a structured peer review submission form with 1–5 scoring (Originality, Technical Quality, Presentation), Overall Recommendation, Strengths, Weaknesses, and Detailed Comments.
8. **Author Console (`/conference/:id/author`)**: Tracks author submissions, real-time review status badges, anonymized peer feedback viewer, and paper submission entry point.
9. **Submit New Paper (`/conference/:id/submit`)**: Paper Title, Conference Track dropdown, validated Abstract counter, dynamic Co-Authors rows, and manuscript PDF upload directly to Firebase Storage.
10. **Automated Transactional Emails**: Powered by Nodemailer and Gmail SMTP to deliver live HTML notification emails to **any email address** worldwide for paper submissions, reviewer invites, and acceptance decisions.

---

## 🛠️ Technology Stack

- **Frontend:** React 19, Vite, React Router 7, Tailwind CSS / Lucide React, Firebase Web SDK
- **Backend:** Node.js, Express.js (ES Modules), Nodemailer (Gmail SMTP)
- **Database & Storage:** Google Cloud Firestore (NoSQL), Firebase Storage (PDF manuscripts)
- **Authentication:** Firebase Authentication (Email/Password & Google OAuth)
- **Hosting & Infrastructure:** Vercel (Frontend SPA), Render (Backend Web Service)

---

## 💻 Local Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/MoyukHNaskaR/ScholarConf.git
cd ScholarConf
```

### 2. Configure Backend
```bash
cd backend
npm install
cp .env.example .env
# Fill in your environment variables in .env
npm run dev
```
Backend runs locally on `http://localhost:5000`.

### 3. Configure Frontend
```bash
cd ../frontend
npm install
npm run dev
```
Frontend runs locally on `http://localhost:5173`.
