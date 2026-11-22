# ScholarConf — UI Layout & Component Specification Notes

This document contains the complete, permanent UI/UX notes extracted from the 9 reference screenshots. All layouts, component hierarchies, colors, fonts, and positions are specified here.

---

## 🎨 Global Design System & Styles
- **Primary Color:** Deep Navy Blue (`#0f2b5c` / `#1e3a8a`) used for primary buttons, active badges, and focus rings.
- **Backgrounds:** Clean off-white / light slate (`#f8fafc` / `#f3f4f6`). Cards are pure white (`#ffffff`).
- **Typography:** Modern clean sans-serif (`-apple-system`, `Inter`, `Segoe UI`).
- **Containers & Cards:** Rounded corners (`12px` / `rounded-xl`), subtle border (`#e2e8f0`), soft box-shadow (`0 1px 3px rgba(0,0,0,0.06)`).
- **Status Badges:** Rounded pills with bold uppercase text:
  - `Submitted` / `In Progress` / `Under Review`: Blue tint (`#dbeafe` background, `#1e40af` text).
  - `Pending Approval` / `Pending Review` / `Reviewer to be Assigned`: Yellow/amber tint (`#fef3c7` background, `#92400e` text).
  - `Approved` / `Reviewed` / `Accepted`: Emerald green tint (`#d1fae5` background, `#065f46` text).
  - `Rejected`: Rose/red tint (`#fee2e2` background, `#991b1b` text).
- **Global Header (Authenticated):**
  - Left: Mortarboard outline icon + **ScholarCon** logo + current page title/breadcrumb.
  - Right: Notification Bell (`🔔`) with unread badge counter + User circle avatar `[JD]` + Name & role label (e.g. `Jane Doe (Chair)`) + dropdown chevron (`v`).

---

## 📄 1. Public Landing Page
- **Navigation Bar:**
  - Left: Mortarboard icon + **ScholarCon** + `Conferences` + `Support`.
  - Right: `Login` / `Get Started` button.
- **Hero Section:**
  - Title: **Academic Conference Management Made Simple** (large bold ~36px).
  - Subtitle: *"End-to-end peer review, paper submission, reviewer matching, and program chair workflows for global research conferences."*
- **3 Feature Cards Grid (Equal Width, 3 Columns):**
  1. **Program Chair:** Gavel/clipboard icon &bull; bullet points:
     - Manage conference tracks & deadlines
     - Assign reviewers to submitted papers
     - Oversee peer review & final decisions
  2. **Authors:** Document/pencil icon &bull; bullet points:
     - Submit research manuscripts & abstracts
     - Track submission & review status in real time
     - View peer feedback & acceptance decisions
  3. **Reviewers:** Search/checklist icon &bull; bullet points:
     - Access assigned conference papers
     - Evaluate research quality & originality
     - Submit structured peer reviews on time
- **Bottom Call to Action:** Centered dark navy button: `Explore Features` & `Get Started`.

---

## 📄 2. Authentication Page (Login & Signup)
- **Header:** Left: **ScholarCon** + `← Back to Home`. Right: `Support`.
- **Card Container:** Centered floating white card (`max-w-[440px]`).
- **Icon & Title:** Mortarboard outline icon at top center &bull; **Log In to ScholarCon** &bull; Subtitle: *"Access your author, reviewer, or program chair console."*
- **Fields:**
  - `Email Address` input (`name@institution.edu`).
  - `Password` input with right-aligned `Forgot password?` link.
- **Buttons:**
  - Full-width dark navy `Log In` button.
  - Divider with text: `Or sign in with`.
  - Full-width white border button: `Google Logo` **Sign in with Google**.
- **Footer Link:** `New to ScholarCon? Create an account` &bull; switches to Registration mode (Name, Email, Password, Confirm Password, Role selection).

---

## 📄 3. Home Dashboard (Conference Listing)
- **Left Sidebar:**
  - Top: Purple mortarboard icon + **Scholar Conf** + subtext *"Conference Management"*.
  - Navigation Item: `🔍 Browse Conferences` (purple pill background, active state).
  - Bottom: `🚪 Log Out` link.
- **Top Right Navigation:**
  - Notification bell `🔔` with red counter badge `(1)`.
  - `+ Create Conference` button (navy blue).
- **Main Section:**
  - Heading: **Welcome to Scholar Conf!** &bull; Subtitle: *"Explore and participate in upcoming conferences"*.
  - Conference Grid: Cards displaying Conference Name, Organization, Dates, Tracks, Chair info, Deadlines, Status.
  - Role-detection click behavior: Automatically opens Chair, Reviewer, or Author dashboard based on membership.

---

## 📄 4. Create Conference Form
- **Header:** Left: **ScholarCon** + `← Back to Home`. Right: `Support`.
- **Card Container:** Centered floating white card (`max-w-[560px]`).
- **Header:** Mortarboard icon &bull; **Create a Conference** &bull; Subtitle: *"Submit a new conference request for organization approval."*
- **Form Fields:**
  1. `Organization Name` (e.g. `IEEE Robotics & Automation Society`).
  2. `Organization Slug` (e.g. `ieee-ras`).
  3. `Chair Name` (e.g. `Dr. Jane Doe`).
  4. `Tracks`: Dynamic list of text inputs with `[X]` remove icon &bull; `+ Add Another Track` button.
- **Actions:** Full-width navy button `Submit Conference Request` &bull; `Cancel` text link.

---

## 📄 5. Super Admin Console
- **Header:** **ScholarCon** logo + `Dashboard` &bull; `🔔` + `[JD]` `Jane Doe (Super Admin)`.
- **Title Row:**
  - Left: **Super Admin Console** &bull; Subtitle: *"Review new conference requests from organizations and oversee all platform conferences."*
  - Right: `+ Create Conference` (white/border) &bull; `📥 Export Report` (white/border).
- **4 Metric Cards Grid:**
  1. `All Conferences` (e.g. 184)
  2. `Pending Requests` (e.g. 2)
  3. `Approved Conferences` (e.g. 168)
  4. `Organizations` (e.g. 92)
- **Tabs & Filter Bar:**
  - Left Tabs: `All Conferences (184)`, `Pending Requests (2)`, `Approved Conferences (168)`, `Archived (14)`.
  - Right: Search input `🔍 Search conferences...` &bull; Year filter `Filter by Year: 2026`.
- **Table Columns:**
  - `Conference Name` (Title + subtext Track)
  - `Organization & Chair` (Org name + "Chair: Dr. Name")
  - `Submitted Date`
  - `Status` badge (`Pending Approval` / `Approved`)
  - `Actions`: For pending: navy `Approve` button + border `Reject` button + `...`; For approved: `...`.

---

## 📄 6. Chair Console
- **Header:** Left: **ScholarCon** + `Dashboard`. Right: `🔔` + `[JD]` `Jane Doe (Chair)`.
- **Title Row:**
  - Left: **Chair Console** &bull; Subtitle: *"Manage conference paper submissions, track review progress, and assign reviewers."*
  - Right: `+ Add New Track` (white/border) &bull; `📥 Export Report` (white/border).
- **4 Metric Cards Grid:**
  1. `Total Submitted Papers` (e.g. 248)
  2. `Under Review` (e.g. 162)
  3. `Reviewed` (e.g. 54)
  4. `Reviewer to be Assigned` (e.g. 32)
- **Tabs & Filter Bar:**
  - Left Tabs: `All Papers (248)`, `Under Review (162)`, `Reviewed (54)`, `Reviewer to be Assigned (32)`.
  - Right Filters: Search input &bull; `Filter by Track: Machine Learning` dropdown &bull; `Assign Reviewers in Bulk` button.
- **Table Columns:**
  - `Paper ID & Title` (e.g. `#1402 - Active Learning on GNNs` + `Track: Graph Representation`)
  - `Authors` (comma-separated author names)
  - `Assigned Reviewers` (names or `Unassigned (0/3)`)
  - `Status` badge (`Under Review (2/3 Reviews Received)`, `Reviewer to be Assigned`, `Reviewed (Score: 4.2/5.0)`)
  - `Actions`:
    - `Assign Reviewer` (navy button) &bull; opens dynamic multi-reviewer assignment modal.
    - `View Progress`
    - `Make Decision` (Accept / Reject) &bull; `View Reviews`.

---

## 📄 7. Reviewer Console
- **Header:** **ScholarCon** logo + `Dashboard` &bull; `🔔` + `[JD]` `Jane Doe (Reviewer)`.
- **Title Row:** **Reviewer Console** &bull; Subtitle: *"Review assigned conference papers and submit your peer evaluations."*
- **4 Metric Cards Grid:**
  1. `Assigned Papers` (e.g. 4)
  2. `Pending Review` (e.g. 2)
  3. `Completed Reviews` (e.g. 2)
  4. `Upcoming Deadline` (e.g. `Dec 15, 2026`)
- **Tabs & Filter Bar:**
  - Tabs: `All Assigned (4)`, `Pending Review (2)`, `Completed (2)`.
  - Right: Search input &bull; Year filter.
- **Table Columns:**
  - `Paper ID & Title`
  - `Conference & Track`
  - `Review Deadline`
  - `Status` (`Pending Review`, `In Progress`, `Reviewed`)
  - `Actions`:
    - `Submit Review` (navy button) &bull; opens structured rubric evaluation modal.
    - `Continue Review`
    - `View Review`.

---

## 📄 8. Author Console
- **Header:** **ScholarCon** logo + `Dashboard` &bull; `🔔` + `[JD]` `Jane Doe (Author)`.
- **Title Row:**
  - Left: **Author Console** &bull; Subtitle: *"Submit new papers and track the status of your conference submissions."*
  - Right: `+ Submit New Paper` (navy button &bull; navigates to submission form).
- **4 Metric Cards Grid:**
  1. `Total Submissions` (e.g. 4)
  2. `Submitted` (e.g. 1)
  3. `Under Review` (e.g. 1)
  4. `Review Done` (e.g. 2)
- **Tabs & Filter Bar:**
  - Tabs: `All Submissions (4)`, `Submitted (1)`, `Under Review (1)`, `Accepted (1)`, `Rejected (1)`.
  - Right: Search input &bull; Year filter.
- **Table Columns:**
  - `Paper ID & Title`
  - `Conference & Track`
  - `Submitted Date`
  - `Status` (`Under Review`, `Submitted`, `Accepted - Review Done`, `Rejected - Review Done`)
  - `Actions`: `View Submission`, `View Reviews`.

---

## 📄 9. Submit New Paper Form
- **Header:** Left: **ScholarCon** + `← Back to Dashboard`. Right: `🔔` + `[JD]` `Jane Doe (Author)`.
- **Card Container:** Centered floating white card (`max-w-[580px]`).
- **Header:** Mortarboard outline icon &bull; **Submit New Paper** &bull; Subtitle: *"Enter paper details, add authors, and upload your manuscript PDF."*
- **Form Fields:**
  1. `Paper Title` (e.g. `Active Learning on Graph Neural Networks`).
  2. `Track` dropdown (`Select a conference track v`).
  3. `Abstract` textarea (`Enter a brief summary of your paper (max 300 words)...`).
  4. `Authors` dynamic row:
     - Input 1: `Name`, Input 2: `Email`, `[X]` remove icon.
     - `+ Add Another Author` button.
  5. `Upload Manuscript (PDF)`: Drag & drop upload area with document icon and file selector.
- **Actions:** Navy button `Submit Paper` &bull; `Cancel` text link.
