# Frontend Development Issues - CGR Portal

**Status**: Ready for Implementation  
**Total Issues**: 24 vertical slices across 7 phases  
**Timeline**: ~4 weeks for MVP  

---

## Phase 1: Foundation (Auth + Feed) - Issues #1-5

### Issue #1: JWT Authentication & Login Flow
**Type**: AFK (Autonomous)  
**Blocked by**: None

#### What to build
Implement user login with JWT authentication and token persistence.

End-to-end behavior:
- Users see login page with username/password form
- Users submit credentials to POST /auth/login
- Backend returns JWT token with user payload (userId, username, role)
- Frontend stores token in localStorage with 5-minute refresh buffer
- Users redirected to feed on successful login
- Token automatically cleared on logout

#### Acceptance criteria
- [ ] Login page renders with form fields (username, password)
- [ ] Form submits to /auth/login endpoint via axios
- [ ] JWT token stored in localStorage on success
- [ ] Token includes userId, username, role decoded from payload
- [ ] useAuth hook provides currentUser and logout function
- [ ] Unauthorized requests receive 401 response
- [ ] Tests: login flow, token storage, logout clears token
- [ ] Tests: invalid credentials show error message

---

### Issue #2: Role-Based Access Control (RBAC)
**Type**: AFK (Autonomous)  
**Blocked by**: #1

#### What to build
Implement role-based UI visibility and component protection.

End-to-end behavior:
- Frontend reads user.role from JWT (EMPLOYEE, COMMS_OFFICER, ADMIN)
- Routes protected by role (e.g., /approval requires ADMIN)
- UI components hidden based on role (e.g., Create Post button hidden from EMPLOYEE)
- Unauthorized access returns 403 error with user-friendly message

#### Acceptance criteria
- [ ] useAuth hook returns user with role property
- [ ] <ProtectedRoute> component enforces role-based access
- [ ] <AdminOnly> wrapper hides content from non-admins
- [ ] <CommsOfficerOnly> wrapper hides content from employees
- [ ] Unauthorized route access redirects to /feed
- [ ] Backend 403 errors mapped to "You don't have permission" message
- [ ] Tests: role-based component visibility
- [ ] Tests: protected route access control

---

### Issue #3: Feed Page - List & Pagination
**Type**: AFK (Autonomous)  
**Blocked by**: #1

#### What to build
Implement published post feed with pagination.

End-to-end behavior:
- Feed page fetches published posts via GET /api/posts
- Posts displayed in chronological order (newest first)
- Each post shows: text, images, author, timestamp, engagement counts
- Pagination: 20 posts per page, pagination controls at bottom
- Users can navigate via "Previous / Next" or page number input
- Loading spinner shown while fetching

#### Acceptance criteria
- [ ] GET /api/posts endpoint called with page=1, pageSize=20
- [ ] Post list renders with correct fields (text, images, author, timestamp)
- [ ] Posts sorted chronologically (newest first)
- [ ] Pagination controls working (previous, next, page navigation)
- [ ] Loading state shown during fetch
- [ ] Error state shows user-friendly message
- [ ] Tests: fetch posts, pagination navigation
- [ ] Tests: error handling (network, validation errors)

---

### Issue #4: Feed - Audience Filtering
**Type**: AFK (Autonomous)  
**Blocked by**: #3

#### What to build
Implement audience-based post filtering.

End-to-end behavior:
- Frontend knows user's audiences (dept + custom groups from JWT or /api/me)
- Feed service filters posts: only show posts visible to user's audiences
- Visibility rules:
  - org-wide posts: visible to everyone
  - dept-only posts: visible if user in that department
  - custom posts: visible if user in that custom group
- Feed respects visibility without explicit filtering UI (server-side enforced)

#### Acceptance criteria
- [ ] useAuth hook provides user.audiences array (dept + custom groups)
- [ ] GET /api/posts calls include audience filtering (or server-side only)
- [ ] Posts filtered correctly per visibility rules
- [ ] Revoked/archived posts excluded from feed
- [ ] Tests: audience filtering accuracy
- [ ] Tests: visibility rules enforced

---

### Issue #5: Feed - Search & Discovery
**Type**: AFK (Autonomous)  
**Blocked by**: #3

#### What to build
Implement search and discovery in the feed.

End-to-end behavior:
- Search box in feed header searches post text content
- Results show only published posts matching query
- Search is client-side (frontend queries returned posts)
- Results include full post details

#### Acceptance criteria
- [ ] Search input in feed header
- [ ] Search query filters posts by text match
- [ ] Results shown in real-time as user types
- [ ] Clear button resets search
- [ ] No results message shown when search empty
- [ ] Tests: search filtering accuracy

---

## Status: Ready for Frontend Team Implementation

Generated: 2026-07-14  
All 24 issues fully specified and ready for autonomous agents.
