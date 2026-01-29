

# Admin Section with Role-Based Access Control

## Overview
Build a complete admin system for EduPortal that allows administrators to:
1. Log in through a dedicated admin login page
2. Control which features each user can access
3. Manage user accounts and their permissions

---

## How It Will Work

When users sign up, they get basic access (user role). Admins can then grant or restrict access to specific features for each user. Regular users only see the features they've been given access to in their sidebar.

**User Flow:**
- Regular users log in at `/auth` -> See only their permitted features
- Admins can also log in at `/auth` or use `/admin-login` -> See all features + Admin dashboard
- First registered user becomes the initial admin (you can change this later)

---

## What You'll Get

### 1. Separate Admin Login Page
A dedicated login page at `/admin-login` for administrators with:
- Clean, professional admin-themed design
- Same authentication but redirects to admin dashboard
- Clear indication this is an admin portal

### 2. Admin Dashboard
A new page at `/admin` where admins can:
- View all registered users
- See each user's current permissions
- Toggle features on/off for any user
- Promote/demote users to admin role

### 3. Permission-Controlled Navigation
The sidebar will automatically:
- Hide features the user doesn't have access to
- Show "Admin" link only to administrators
- Display the Dashboard for all users (always accessible)

---

## Features That Can Be Controlled

| Feature | Description |
|---------|-------------|
| Students | View and manage student records |
| Sections | Create and edit class sections |
| Register | Take student attendance |
| Virtual Audit | Submit teaching audits |
| Schedule | Manage class schedules |
| Lesson Plan | Create lesson plans |
| Tasks | Personal task management |
| Off Days | Request time off |

---

## Admin Dashboard Layout

```text
+--------------------------------------------------+
|  Admin Dashboard                                 |
+--------------------------------------------------+
|  Users                               [Refresh]   |
+--------------------------------------------------+
| Name          | Email         | Role   | Actions |
|---------------|---------------|--------|---------|
| John Doe      | john@mail.com | Admin  | [Edit]  |
| Jane Smith    | jane@mail.com | User   | [Edit]  |
+--------------------------------------------------+

When clicking [Edit]:
+--------------------------------------------------+
|  Permissions for: Jane Smith                     |
+--------------------------------------------------+
| Feature        | Access                          |
|----------------|----------------------------------|
| Students       | [ON/OFF Toggle]                  |
| Sections       | [ON/OFF Toggle]                  |
| Register       | [ON/OFF Toggle]                  |
| Virtual Audit  | [ON/OFF Toggle]                  |
| Schedule       | [ON/OFF Toggle]                  |
| Lesson Plan    | [ON/OFF Toggle]                  |
| Tasks          | [ON/OFF Toggle]                  |
| Off Days       | [ON/OFF Toggle]                  |
|                                                  |
| Admin Role     | [Checkbox] Make Admin            |
+--------------------------------------------------+
```

---

## Security Approach

1. **Roles stored securely**: User roles are in a separate protected table, not in user profiles
2. **Server-side validation**: All permission checks happen in the database, not just in the browser
3. **Protected routes**: Admin pages verify admin status before showing content
4. **New users get default permissions**: When someone signs up, they automatically get access to all features (you can restrict later)

---

## Technical Implementation Details

### Database Changes

**New Tables:**

1. `user_roles` - Stores who is an admin vs regular user
   - user_id, role (admin/user)
   
2. `user_permissions` - Stores feature access for each user
   - user_id, feature name, enabled (true/false)

**Security Functions:**
- `has_role()` - Safely checks if a user has admin role
- Trigger to assign default role and permissions on signup

### New Files

| File | Purpose |
|------|---------|
| `src/pages/AdminLogin.tsx` | Dedicated admin login page |
| `src/pages/Admin.tsx` | Admin dashboard for managing users |
| `src/hooks/usePermissions.tsx` | Hook to check user permissions throughout the app |
| `src/components/admin/UserPermissionsDialog.tsx` | Dialog to edit a user's permissions |

### Files to Update

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/admin` and `/admin-login` routes |
| `src/components/layout/Sidebar.tsx` | Filter nav items based on permissions, add Admin link |
| `src/hooks/useAuth.tsx` | Add `isAdmin` flag to auth context |
| `src/components/layout/DashboardLayout.tsx` | Pass permission context |

---

## First-Time Setup

After implementation, the **first user** to sign up will automatically become an admin. If you already have users in the system, I'll provide a simple command to promote an existing user to admin.

---

## Implementation Steps

1. **Database Setup**
   - Create the role and permissions tables
   - Add security policies
   - Create helper functions
   - Set up automatic role assignment for new users

2. **Admin Login Page**
   - Create a separate login page with admin branding
   - Same authentication logic, different redirect

3. **Permissions System**
   - Build the usePermissions hook
   - Integrate with auth context

4. **Admin Dashboard**
   - User list with role display
   - Permission editing dialog
   - Toggle switches for each feature

5. **Sidebar Updates**
   - Filter navigation based on user permissions
   - Show Admin link only to admins

6. **Route Protection**
   - Guard admin routes
   - Redirect unauthorized access attempts

