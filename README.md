# ScholarConf – Academic Conference Management Toolkit

A full-stack Academic Conference Management System built with **React.js**, **Node.js / Express.js**, **Firebase (Authentication, Firestore, Storage)**, and **Resend Email Automation**.

---

## 🌐 Live Local Servers
- **Frontend Application:** `http://localhost:5173`
- **Backend Express API:** `http://localhost:5000`

---

## 🔑 Pre-Seeded Accounts for Testing All 4 Roles

The following accounts are already registered in Firebase Authentication & Cloud Firestore and linked to sample prototype data in **ICML 2026**:

| Role | Email | Password | Console Destination |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@scholarconf.com` | `Admin123!` | **Super Admin Console** (`/super-admin`) |
| **Program Chair** | `chair@scholarconf.com` | `Password123!` | **Chair Console** (clicking *ICML 2026*) |
| **Reviewer** | `reviewer@scholarconf.com` | `Password123!` | **Reviewer Console** (clicking *ICML 2026*) |
| **Author** | `author@scholarconf.com` | `Password123!` | **Author Console** (clicking *ICML 2026*) |

*You can also sign in with **Google Sign-In** or register any new email account.*

---

## 📄 Implemented Pages & Workflows

1. **Public Landing Page (`/`)**: Hero section, Program Chair / Authors / Reviewers feature cards, Explore Features CTA, and Login / Get Started navigation.
2. **Authentication Page (`/login`)**: Email/Password login, Signup, Password Reset, and Google OAuth Sign-In.
3. **Home Dashboard (`/dashboard`)**: Left sidebar navigation, unread notification bell, Create Conference button, active approved conferences listing, and **automatic conference-specific role routing** (Chair $\rightarrow$ Chair Console, Reviewer $\rightarrow$ Reviewer Console, Author/Default $\rightarrow$ Author Console — with no manual role switcher).
4. **Create Conference Form (`/create-conference`)**: Organization Name, Slug, Chair Name, dynamic Tracks (`+ Add Another Track` / Remove), submitting a `Pending Approval` request.
5. **Super Admin Console (`/super-admin`)**: 4 metric cards, status tabs, search & year filter, and `Approve` / `Reject` / `Archive` actions with Firestore transactions assigning the sole Conference Chair.
6. **Chair Console (`/conference/:id/chair`)**: 4 metric cards, status tabs, track filter, `Assign Reviewer` popup modal supporting multiple reviewers, automatic status transitions (`Reviewer to be Assigned` $\rightarrow$ `Under Review` $\rightarrow$ `Reviewed`), and Final Decision (`Accept Paper` / `Reject Paper`).
7. **Reviewer Console (`/conference/:id/reviewer`)**: Restricted strictly to papers assigned to the logged-in reviewer. Includes structured peer review modal with 1–5 ratings (Originality, Technical Quality, Presentation), Overall Recommendation, Strengths, Weaknesses, Detailed Comments, `Save Draft`, and `Submit Review`.
8. **Author Console (`/conference/:id/author`)**: Displays the author's own submissions, real-time review status badges, anonymized peer feedback viewer, and `+ Submit New Paper` button.
9. **Submit New Paper Form (`/conference/:id/submit`)**: Paper Title, Conference Track dropdown, 300-word validated Abstract, dynamic Co-Authors rows, and PDF Manuscript upload to Firebase Storage.
