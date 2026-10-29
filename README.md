# NEXUSORBIT — Ultimate College Management Portal
> **Hackathon Edition** • Full-Stack Relational Architecture • Grounded AI Campus Assistant • Role-Based Dashboards • WCAG 2.2 AA Accessible

[![Portal Health](https://img.shields.io/badge/System_Health-100%25_Operational-059669.svg)](#)
[![Database](https://img.shields.io/badge/Database-SQLite_3_(WAL_Mode)-2563eb.svg)](#)
[![Tests](https://img.shields.io/badge/Tests-14_Passed_/_0_Failed-10B981.svg)](#)
[![WCAG](https://img.shields.io/badge/Accessibility-WCAG_2.2_AA-0284c7.svg)](#)

---

## 1. Project Overview

**NexusOrbit** is an intelligent, full-stack college management portal engineered for competitive collegiate hackathons and institutional demonstrations. Unlike superficial mockups or static templates, NexusOrbit is a fully functional web platform powered by a persistent relational database (`SQLite 3` via native `node:sqlite`), an automated early-warning academic risk alert system, role-tailored workflows for four academic personas, and a grounded **AI Campus Assistant** that queries live portal data to deliver accurate facts.

### Brand Personality & Visual Direction
* **Personality**: Intelligent, Trustworthy, Minimal, Modern, Premium, Academic yet technology-driven.
* **Palette**: Deep Navy (`#0B132B`, `#1C2541`), Cool White (`#F8FAFC`, `#FFFFFF`), Muted Blue (`#3A506B`, `#E2E8F0`), and an Electric Orbital Blue accent (`#2563EB`, `#06B6D4`).
* **Design Standards**: WCAG 2.2 AA high contrast ratios, responsive mobile shell, dark/light theme persistence, and motion-safe transitions.

---

## 2. Signature Opening Experience

NexusOrbit implements a distinct, 3-stage opening experience designed to impress hackathon evaluators while remaining strictly accessible:

1. **Stage A — Branded Splash Screen**:
   * Centered original vector orbital symbol combining rotating outer rings, satellite nodes, and an academic campus core.
   * Elegant wordmark lockup (`Nexus`**Orbit**) with live progress tracking.
2. **Stage B — Smooth Transition**:
   * Refined 1.5-second sequence that smoothly fades into the login interface.
   * Runs **once per browser session** (`sessionStorage`) so internal navigation is never interrupted.
   * Full respect for `prefers-reduced-motion` and keyboard dismissal (`Enter`, `Space`, `Escape`).
3. **Stage C — Demo-Ready Authentication**:
   * Clear, accessible sign-in form with password visibility toggling.
   * **1-Click Hackathon Judge Quick Access**: Four one-click cards that log judges directly into each persona without manual credential entry.

---

## 3. Four User Personas & Role-Based Dashboards

NexusOrbit delivers distinct, role-tailored dashboards and granular permission controls:

### 1. ⚡ Administrator (`admin@nexusorbit.edu`)
* **KPI Metrics**: Total Enrolled Students, Active Faculty, Campus Attendance %, Fee Collection Dues, and Active Academic Alerts.
* **Student Registry**: Complete directory of students, roll numbers, programs, individual attendance percentages, and standing indicators.
* **Faculty Registry**: Professor records, employee codes, departments, cabin locations, and office consultation hours.
* **Course Catalog**: Subject allocations, credits, and assigned lead professors.
* **Alerts Cockpit**: Review institutional risk flags with one-click **"Resolve"** actions.
* **Notice Broadcasting**: Create and publish campus-wide announcements targeting specific or all audiences.

### 2. 🏛️ Faculty Member (`faculty@nexusorbit.edu` — Prof. Anita Roy)
* **Assigned Courses**: Courses taught with section allocations and student lists.
* **Interactive Attendance Sheet**: Record daily session attendance with 1-click **"Mark All Present"**, individual status toggles (Present/Absent/Late), session topics, and instant database persistence.
* **Marks & Grading**: Create assessments (Quizzes, Midterms, Labs, Finals) with custom max marks, score entry, and auto-computed percentages.
* **Coursework Evaluation**: Publish assignments, inspect student submissions, view submitted attachments, and award grades with faculty feedback.
* **Students Requiring Attention**: Real-time identification of students with attendance below 75% or failing grades.

### 3. 🎓 Student (`student@nexusorbit.edu` — Aarav Sharma, 2024CSE042)
* **Student Identity Card**: Personal academic profile, B.Tech CSE Year 3, Section A, mentor details.
* **Attendance Overview**: Cumulative attendance gauge with automated calculation of how many consecutive classes are needed if below 75%.
* **Subject Breakdown**: Course-by-course attendance bars with a visual **75% institutional threshold indicator**.
* **Academic Marks**: Continuous assessment transcript with grade badges and percentage calculation.
* **Class Timetable**: Weekly schedule (Monday to Friday) highlighting rooms and faculty leads.
* **Coursework Manager**: Track upcoming deadlines and submit text narratives and simulated document attachments (`.pdf`, `.zip`).
* **Fee Settlement & Printable Receipt**: Itemized fee balances, instant demonstration payment gateway, and computer-generated printable receipt.

### 4. 👨‍👧 Parent (`parent@nexusorbit.edu` — Rajesh Sharma)
* **Strict Scoping**: Authoritatively restricted to the linked child's records (**Aarav Sharma**). Never exposes other students' private data.
* **Ward Standing**: Child's attendance gauge, marks summary, and fee ledger.
* **Attendance Risk Alert**: Actionable alert notifying parents if their child is under the 75% threshold in any subject (e.g. CS502 Algorithms at 66.7%).
* **Academic Mentor Advisory**: Direct contact card for child's faculty advisor (Prof. Anita Roy, Cabin 304).
* **Parent Notices**: Filtered circulars specifically intended for parent-teacher interactions.

---

## 4. Signature Feature: Grounded AI Campus Assistant

The **NexusOrbit AI Campus Assistant** is accessible from the floating action button and sidebar across the portal.

### Relational Fact Grounding
Unlike generic chatbots that hallucinate static text, NexusOrbit's AI assistant is connected to the **live SQLite database**:
* **Attendance Queries** (*"What is my attendance in Algorithms?"*):
  * Retrieves verified session counts from `attendance_records`.
  * Computes exact attendance percentage (**66.7%**).
  * Calculates the exact number of consecutive classes required to reach the mandatory 75% threshold (**4 classes**).
* **Timetable Queries** (*"What classes do I have on Monday?"*):
  * Queries `timetable` table for Section A and returns times, subjects, and room numbers.
* **Coursework Deadlines** (*"What assignments are due?"*):
  * Pulls pending assignments from `assignments` and `assignment_submissions`.
* **Fee Queries** (*"What is my remaining fee balance?"*):
  * Pulls itemized structures from `fee_structures` and reports remaining balances.
* **Official Circulars** (*"Show recent urgent notices"*):
  * Searches `notices` table filtered by user role and priority.

### External LLM Extension
If a `GEMINI_API_KEY` or `OPENAI_API_KEY` environment variable is supplied, the assistant can optionally route the grounded database facts into an external LLM for conversational elaboration. If no key is present, it runs in **Local Relational Intelligence Mode** with 100% deterministic accuracy.

---

## 5. Technology Stack & Architecture

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Backend Runtime** | Node.js v24 (Portable / Native) | High-performance, event-driven HTTP server |
| **Database Engine** | SQLite 3 via `node:sqlite` (WAL Mode) | Genuine persistent relational storage, zero external database setup required |
| **Frontend Architecture** | Modern Component SPA | Lightning fast, zero bundler failure points, responsive on all devices |
| **Styling & Design** | CSS Design Tokens & Modern Grid | Midnight blue theme, WCAG 2.2 AA compliant focus styles, print stylesheets |
| **Icons & Charts** | Pure Vector SVG Components | Accessible charts, donut gauges, zero external CDN dependencies |
| **Security & Auth** | Bearer Token Session Store | Role-based authorization enforced on protected REST endpoints |

---

## 6. Demo Accounts for Hackathon Judges

Judges can use the **1-Click Quick Access buttons** on the sign-in screen, or enter credentials manually:

| Role | Email | Password | Persona & Responsibility |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@nexusorbit.edu` | `demo123` | Dr. Vikram Malhotra (Dean of Academic Affairs) |
| **Faculty Lead** | `faculty@nexusorbit.edu` | `demo123` | Prof. Anita Roy (Associate Professor & HOD CSE) |
| **Student** | `student@nexusorbit.edu` | `demo123` | Aarav Sharma (Roll No: 2024CSE042, 5th Sem) |
| **Parent** | `parent@nexusorbit.edu` | `demo123` | Rajesh Sharma (Parent of Aarav Sharma) |

---

## 7. Installation & Quick Startup

NexusOrbit is configured to run out-of-the-box on any Windows machine with **zero manual dependency installations**.

### Method 1: Double-Click Batch File (Fastest)
Double-click `run-nexusorbit.bat` in the project root directory.

### Method 2: PowerShell
```powershell
.\start.ps1
```

### Method 3: Standard Node / NPM
```bash
npm start
# or
node server.js
```

The portal server will start immediately at:
👉 **`http://127.0.0.1:3000`**

Open `http://127.0.0.1:3000` in Google Chrome, Microsoft Edge, or Mozilla Firefox.

---

## 8. Automated Test Suite Validation

NexusOrbit includes an automated test suite verifying all 14 core subsystems end-to-end:

```powershell
.\node.bat test-suite.js
```

### Test Results Output:
```
========================================================
   NEXUSORBIT MASTER TEST SUITE — HACKATHON VALIDATION   
========================================================

• Testing: Static Web Shell (index.html)... ✓ PASS
• Testing: Master Stylesheet (main.css)... ✓ PASS
• Testing: API Health & System Status... ✓ PASS
• Testing: Demo Authentication: Student Role (Aarav Sharma)... ✓ PASS
• Testing: Student Dashboard Statistics... ✓ PASS
• Testing: Subject-Wise Attendance & 75% Risk Calculation... ✓ PASS
• Testing: AI Assistant Grounded Attendance Query... ✓ PASS
• Testing: AI Assistant Grounded Timetable Query... ✓ PASS
• Testing: Demo Authentication: Faculty Role (Prof. Anita Roy)... ✓ PASS
• Testing: Faculty Attendance Session Recording Transaction... ✓ PASS
• Testing: Demo Authentication: Parent Role (Scoped to Aarav Sharma)... ✓ PASS
• Testing: Demo Authentication: Administrator Role (Dr. Vikram Malhotra)... ✓ PASS
• Testing: Admin Student Records & Standing Evaluation... ✓ PASS
• Testing: Fee Balance & Demo Settlement Transaction... ✓ PASS

========================================================
TEST SUMMARY: 14 PASSED, 0 FAILED
========================================================
```

---

## 9. Key REST API Endpoints

* `GET  /api/health` — System status, uptime, persistence mode.
* `POST /api/auth/demo-login` — Instant role login for judges (`{ role: "admin" | "faculty" | "student" | "parent" }`).
* `POST /api/auth/login` — Standard credential login.
* `GET  /api/dashboard/stats` — Role-specific KPI metrics and attendance summaries.
* `GET  /api/attendance?student_id=...` — Subject-wise attendance and threshold alerts.
* `POST /api/attendance/session` — Record a classroom attendance session with student marks.
* `GET  /api/marks?student_id=...` — Continuous assessment results and course percentages.
* `POST /api/marks/assessment` — Create assessment and grade records.
* `GET  /api/timetable?section=A` — Weekly scheduled lecture slots.
* `GET  /api/assignments` — Coursework list with submission statuses.
* `POST /api/assignments/:id/submit` — Student coursework submission endpoint.
* `POST /api/assignments/grade` — Faculty grading and feedback endpoint.
* `GET  /api/fees?student_id=...` — Fee ledger and verified transaction records.
* `POST /api/fees/pay-demo` — Demonstration payment gateway with balance update and receipt generation.
* `GET  /api/alerts` — Active early risk alerts.
* `POST /api/alerts/:id/resolve` — Mark alert as addressed.
* `POST /api/ai/chat` — Grounded AI query resolution.

---

## 10. WCAG 2.2 AA Accessibility Compliance

* **Keyboard Operability**: Full keyboard navigation across all forms, dialogs, drawers, and data tables.
* **Visible Focus**: Clear `:focus-visible` outline rings on all interactive elements.
* **Semantic ARIA**: `role="banner"`, `role="navigation"`, `role="main"`, `aria-live` toast regions, `aria-modal` dialogs.
* **Color Independence**: Informational states are conveyed through distinct icons, labels, and text badges in addition to color.
* **Reduced Motion**: Respects `prefers-reduced-motion: reduce` by disabling non-essential transitions.

---

## 11. Hackathon Judges Demonstration Guide

For a 3-minute hackathon presentation, follow this sequence:
1. **Launch**: Double click `run-nexusorbit.bat` and open `http://127.0.0.1:3000`.
2. **Branded Opening**: Watch the orbital vector logo animation transition smoothly into the login screen.
3. **Student Journey**:
   * Click **"🎓 Student (Aarav Sharma)"**.
   * Note the **Critical Attendance Alert** in CS502 Algorithms (66.7% vs 75% required).
   * Open the **Campus AI Assistant** and click *"What is my attendance in Algorithms?"* to see the grounded fact response.
   * Go to **Fees & Receipts**, click **"Pay Outstanding"**, simulate payment of ₹15,000, and click **"View Receipt"** to show printable proof.
4. **Faculty Journey**:
   * Switch to **"🏛️ Faculty (Prof. Anita Roy)"**.
   * Mark today's attendance session with 1-click **"Mark All Present"** and save.
   * Review coursework submissions and award marks with feedback.
5. **Parent Journey**:
   * Click **"👨‍👧 Parent (Rajesh Sharma)"**.
   * Verify that the parent view is strictly scoped to Aarav Sharma and shows the mentor advisory details.
6. **Administrator Journey**:
   * Click **"⚡ Administrator (Dr. Vikram Malhotra)"**.
   * Inspect the institutional risk alerts table and click **"Resolve"** on an addressed notice.

---

*Designed and engineered with passion for the collegiate innovation hackathon.*
