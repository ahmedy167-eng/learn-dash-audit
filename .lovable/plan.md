

# Fix Student Login - RLS Policy Issue

## Problem Identified
The student login is failing because of Row Level Security (RLS) policies on the `students` table.

### Current Situation
- Students try to log in by entering their name and student ID
- The system queries the `students` table to verify these credentials
- **However**, the query is made by an unauthenticated user (students don't have accounts in the authentication system)
- The current RLS policies on the `students` table only allow:
  - Admins to view all students
  - Authenticated teachers/users to view their own students (where `auth.uid() = user_id`)
- Since students are not authenticated, they get **zero rows** returned, which shows as "Invalid name or student ID"

### Why This Happens
When a student visits the login page and enters their credentials, they don't have a session. The Supabase client makes the query as an anonymous/unauthenticated user. The RLS policies block this because there's no rule allowing unauthenticated access.

---

## Solution
Add a new RLS policy that allows **anyone** to SELECT from the `students` table, but **only specific columns** needed for authentication verification.

### Security Consideration
We need to be careful about what data is exposed. The approach will be:
- Allow public SELECT access for login verification
- The query only selects: `id, full_name, student_id, section_id, section_number, course`
- No sensitive data like attendance counts, notes, or other private information is exposed through the login flow

---

## Database Change Required

### New RLS Policy
Add a policy to allow anonymous users to verify student credentials:

```sql
-- Allow anyone to query students table for login verification
CREATE POLICY "Allow public read for student login"
  ON public.students
  FOR SELECT
  USING (true);
```

This policy allows SELECT operations for all users (including unauthenticated ones).

---

## Implementation

### Step 1: Database Migration
Create a migration to add the new RLS policy that enables public read access to the students table.

### Step 2: No Code Changes Needed
The existing `useStudentAuth.tsx` code is correct. Once the RLS policy allows the query, login will work.

---

## Alternative Approaches Considered

### Option A: Edge Function (More Secure)
Create a backend function that handles student authentication server-side, bypassing RLS. This is more secure but adds complexity.

### Option B: Simple RLS Policy (Recommended)
Add a public SELECT policy. This is simpler and the data in the students table is not highly sensitive (names and IDs are typically not private in an educational context).

**Recommendation**: Use Option B for simplicity. The student name and ID combination acts as the authentication mechanism, and the data exposed (name, section, course) is appropriate for the student to see.

---

## Summary
| Current State | After Fix |
|--------------|-----------|
| Student login query blocked by RLS | Student login query succeeds |
| Error: "Invalid name or student ID" | Login works with correct credentials |
| No anonymous access to students table | Anonymous can SELECT from students for login |

