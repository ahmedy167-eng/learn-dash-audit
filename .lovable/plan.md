
# Enhanced Admin Dashboard: Teacher Data Visibility

## Overview
The admin currently only sees basic user info (name, email, role). This plan will enhance the Admin page to give administrators complete visibility into each teacher's data - their sections, students, audits, lesson plans, and more.

## Current Limitations
- Admin can only see user names, emails, and roles
- No visibility into what data each teacher has created
- Cannot view a teacher's sections or student lists
- No way to see teaching audit records or lesson plans

---

## The Solution

### 1. Enhanced User Table with Stats
Add summary statistics to the user list showing each teacher's:
- Number of sections
- Number of students  
- Number of audits submitted
- Number of lesson plans

### 2. User Detail Dialog
Create a new dialog that opens when clicking "View" on a user, showing:
- **Overview Tab**: Profile info and activity summary
- **Sections Tab**: List of all sections created by this teacher
- **Students Tab**: All students belonging to this teacher
- **Audits Tab**: Virtual audit records submitted
- **Lesson Plans Tab**: Recent lesson plans

### 3. Database RLS Updates
Add policies to allow admins to view ALL data across tables:
- `students` - Admin can view all students
- `sections` - Admin can view all sections
- `virtual_audits` - Admin can view all audits
- `cover_class_audits` - Admin can view all cover audits
- `lesson_plans` - Admin can view all lesson plans
- `schedules` - Admin can view all schedules
- `tasks` - Admin can view all tasks

---

## Technical Implementation

### Database Migrations
Add 7 RLS policies for admin read access:

```sql
-- Allow admins to view all students
CREATE POLICY "Admins can view all students"
ON public.students FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all sections
CREATE POLICY "Admins can view all sections"
ON public.sections FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all virtual audits
CREATE POLICY "Admins can view all virtual_audits"
ON public.virtual_audits FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all cover class audits
CREATE POLICY "Admins can view all cover_class_audits"
ON public.cover_class_audits FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all lesson plans
CREATE POLICY "Admins can view all lesson_plans"
ON public.lesson_plans FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all schedules
CREATE POLICY "Admins can view all schedules"
ON public.schedules FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all tasks
CREATE POLICY "Admins can view all tasks"
ON public.tasks FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
```

### New Component: `UserDetailsDialog.tsx`
Creates a tabbed dialog showing:
- Profile overview with stats cards
- Data tables for sections, students, audits, lesson plans
- Search and filter capabilities within each tab

### Updated: `Admin.tsx`
- Add stats columns to user table
- Add "View" button to open details dialog
- Fetch aggregate counts for each user

---

## UI Preview

### User Table (Enhanced)
```text
+-------------+------------------+--------+----------+----------+--------+---------+
| Name        | Email            | Role   | Sections | Students | Audits | Actions |
+-------------+------------------+--------+----------+----------+--------+---------+
| Ahmed Ali   | ahmed@ksu.edu.sa | User   | 0        | 0        | 1      | View Edit|
| Waleed      | waleed@email.com | Admin  | 1        | 5        | 2      | View Edit|
+-------------+------------------+--------+----------+----------+--------+---------+
```

### User Details Dialog (Tabs)
```text
+-------------------------------------------------------------------+
| Teacher: Waleed (waleed@email.com)                      [X Close] |
+-------------------------------------------------------------------+
| [Overview] [Sections] [Students] [Audits] [Lesson Plans]          |
+-------------------------------------------------------------------+
|                                                                   |
|  Sections (1)                                                     |
|  +---------------------------------------------------------------+|
|  | Section Name | Course   | Room  | Days      | Students        ||
|  +---------------------------------------------------------------+|
|  | Section A    | ENGL 101 | R101  | Sun, Tue  | 5               ||
|  +---------------------------------------------------------------+|
|                                                                   |
+-------------------------------------------------------------------+
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/admin/UserDetailsDialog.tsx` | Create | New dialog with tabbed view of user data |
| `src/pages/Admin.tsx` | Modify | Add stats columns and View button |
| Database migration | Create | Add 7 admin RLS policies |

---

## Result After Implementation
- Admins can see how many sections/students each teacher has
- Clicking "View" opens a detailed breakdown of any teacher's data
- Full visibility into sections, student lists, audit records, and lesson plans
- Read-only access - admins can view but not modify teacher data
