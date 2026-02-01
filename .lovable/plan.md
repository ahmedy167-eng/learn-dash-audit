
# Student Portal System

## Overview
This plan creates a complete student portal where students can log in using their name and student ID (no password required). Once logged in, they access a dedicated portal with three main sections: Quizzes, LMS Updates, and CA Projects.

---

## System Components

### 1. Student Authentication
Students will log in using:
- **Full Name** (must match exactly what admin registered)
- **Student ID** (must match exactly)

No password is required - the system verifies credentials against existing student records in the database.

### 2. Student Portal Sections

#### A. Quizzes Section
- Students see quizzes assigned to their section
- Each quiz has one question with four possible answers
- Includes reading comprehension passages
- Students can submit answers and see their results
- Admin creates quizzes from the teacher dashboard

#### B. LMS Updates Section
- Displays student's learning progress
- Shows completed units and points earned
- Admin updates this information per student

#### C. CA Project Section
- Displays the CA project question/prompt (PDF uploaded by admin)
- Students can download the PDF
- Tracks student progress through stages:
  - Ideas & Description
  - First Draft
  - Second Draft
  - Final Draft
- Admin can view and provide feedback on each stage

---

## Database Design

### New Tables

```text
+------------------+     +------------------+     +------------------+
|     quizzes      |     |  quiz_questions  |     | quiz_submissions |
+------------------+     +------------------+     +------------------+
| id               |---->| id               |     | id               |
| section_id       |     | quiz_id          |---->| question_id      |
| user_id (admin)  |     | question_text    |     | student_id       |
| title            |     | reading_passage  |     | selected_answer  |
| description      |     | option_a         |     | is_correct       |
| is_active        |     | option_b         |     | submitted_at     |
| created_at       |     | option_c         |     +------------------+
+------------------+     | option_d         |
                         | correct_answer   |
                         +------------------+
```

```text
+------------------+     +------------------+
|   lms_progress   |     |   ca_projects    |
+------------------+     +------------------+
| id               |     | id               |
| student_id       |     | section_id       |
| unit_name        |     | user_id (admin)  |
| points           |     | title            |
| is_completed     |     | description      |
| updated_by       |     | pdf_url          |
| created_at       |     | created_at       |
+------------------+     +------------------+

+------------------+
| ca_submissions   |
+------------------+
| id               |
| project_id       |
| student_id       |
| stage            |  (ideas, first_draft, second_draft, final_draft)
| content          |
| feedback         |
| submitted_at     |
+------------------+
```

### Storage Bucket
A new storage bucket `ca-project-pdfs` will store the PDF files uploaded by admins.

---

## Page Structure

### New Pages

| Page | Route | Purpose |
|------|-------|---------|
| Student Login | `/student-login` | Simple login with name + ID |
| Student Portal | `/student-portal` | Main dashboard for students |
| Student Quizzes | `/student-portal/quizzes` | View and take quizzes |
| Student LMS | `/student-portal/lms` | View LMS progress |
| Student CA Projects | `/student-portal/ca-projects` | View and submit CA work |

### Admin Pages (New Sections)

| Page | Route | Purpose |
|------|-------|---------|
| Manage Quizzes | `/quizzes` | Create/edit quizzes for sections |
| Manage LMS Progress | `/lms-management` | Update student LMS data |
| Manage CA Projects | `/ca-projects` | Upload PDFs, view submissions |

---

## User Flow

### Student Flow
```text
[Landing Page] --> [Student Login Button]
       |
       v
[Enter Name + Student ID] --> [Validation]
       |                           |
       v                           v
   [Match Found]            [No Match - Error]
       |
       v
[Student Portal Dashboard]
       |
   +---+---+---+
   |   |   |   |
   v   v   v   v
[Quizzes] [LMS] [CA Projects]
```

### Admin Flow for Quizzes
```text
[Admin Dashboard] --> [Quizzes Menu]
       |
       v
[Select Section] --> [Create Quiz]
       |
       v
[Add Question with 4 Options + Reading Passage]
       |
       v
[Quiz Published to Students]
```

---

## Files to Create

### Components
| File | Purpose |
|------|---------|
| `src/pages/StudentLogin.tsx` | Student login page |
| `src/pages/StudentPortal.tsx` | Student main dashboard |
| `src/pages/student/StudentQuizzes.tsx` | Quiz listing and taking |
| `src/pages/student/StudentLMS.tsx` | LMS progress view |
| `src/pages/student/StudentCAProjects.tsx` | CA project view and submission |
| `src/pages/Quizzes.tsx` | Admin quiz management |
| `src/pages/LMSManagement.tsx` | Admin LMS updates |
| `src/pages/CAProjects.tsx` | Admin CA project management |
| `src/components/student/StudentLayout.tsx` | Layout for student portal |
| `src/components/student/QuizCard.tsx` | Quiz display component |
| `src/components/student/LMSProgressCard.tsx` | LMS progress card |
| `src/components/student/CAProjectCard.tsx` | CA project card |
| `src/hooks/useStudentAuth.tsx` | Student authentication context |

### Database Migration
Single migration file with:
- 6 new tables (quizzes, quiz_questions, quiz_submissions, lms_progress, ca_projects, ca_submissions)
- RLS policies for each table
- Storage bucket for PDFs

---

## Technical Details

### Student Authentication Context
```typescript
// Separate from teacher auth - uses student table
interface StudentAuthContextType {
  student: Student | null;
  loading: boolean;
  signIn: (name: string, studentId: string) => Promise<{ error: Error | null }>;
  signOut: () => void;
}
```

### RLS Policies Summary

| Table | Students Can | Admin/Teachers Can |
|-------|-------------|-------------------|
| quizzes | SELECT (their section) | Full CRUD (own sections) |
| quiz_questions | SELECT (via quiz) | Full CRUD |
| quiz_submissions | INSERT/SELECT own | SELECT all |
| lms_progress | SELECT own | Full CRUD |
| ca_projects | SELECT (their section) | Full CRUD |
| ca_submissions | INSERT/UPDATE/SELECT own | Full CRUD |

### Storage Bucket Policy
- Admins can upload/delete PDFs
- Students can download PDFs for their section

---

## Updated Sidebar Navigation

### Teacher/Admin Sidebar (existing + new)
- Dashboard
- Students
- Sections
- Register
- Virtual Audit
- Schedule
- Lesson Plan
- Tasks
- Off Days
- **Quizzes** (new)
- **LMS Management** (new)
- **CA Projects** (new)
- Admin (if admin)

### Student Portal Sidebar (new)
- Dashboard
- Quizzes
- LMS Updates
- CA Projects
- Logout

---

## Landing Page Update

Add a "Student Login" button on the main landing page that routes to `/student-login`.

```text
+------------------------------------------+
|  EduPortal              [Sign In] [Student Login]
+------------------------------------------+
|                                          |
|     Education Management Made Simple     |
|                                          |
|  [Get Started]  [Sign In]  [Student Portal]
|                                          |
+------------------------------------------+
```

---

## Implementation Order

1. **Phase 1: Database Setup**
   - Create all new tables with RLS
   - Create storage bucket for PDFs

2. **Phase 2: Student Authentication**
   - Create student auth context
   - Build student login page
   - Build student portal layout

3. **Phase 3: Admin Features**
   - Quiz creation/management page
   - LMS management page
   - CA project management with PDF upload

4. **Phase 4: Student Portal Features**
   - Quiz taking interface with results
   - LMS progress display
   - CA project viewing and submission

5. **Phase 5: Integration**
   - Update landing page with student login
   - Add new items to admin sidebar
   - Testing and refinement
