# Phase 3: Approval Workflow Frontend Implementation

## Overview
This document outlines the complete implementation of Phase 3 approval workflow frontend (Issues #10-14) following strict TDD methodology.

## Issues Implemented

### Issue #10: Approval Dashboard - Submission Queue
**Location:** `apps/web/src/pages/Approval.tsx` and `apps/web/src/pages/Approval.test.tsx`

**Features:**
- Protected `/approval` route (ADMIN only via ProtectedRoute)
- Fetches pending approval queue from `/api/submissions/queue`
- Queue displays:
  - Author name
  - Submission date
  - Status badge (PENDING or PENDING_REVIEW with reviewer name)
  - Click to open detail view
- Queue count badge in header
- Sorted by submission date (oldest first)
- Loading and error states

**Hook:** `useApprovalQueue()` in `apps/web/src/hooks/useApprovalQueue.ts`
- Manages queue state
- Auto-sorts submissions by date
- Provides `refresh()` method to update queue
- Handles fetch errors gracefully

**Test Coverage:**
- Admin access enforcement
- Queue fetch and display
- Status badge variations (PENDING vs PENDING_REVIEW)
- Queue sorting (oldest first)
- Queue count display
- Loading/error states
- Detail view navigation

### Issue #11: Approval - Reject & Feedback
**Location:** `apps/web/src/pages/ApprovalDetail.tsx` and `apps/web/src/pages/ApprovalDetail.test.tsx`

**Features:**
- "Request Feedback" button opens modal
- Modal accepts feedback message
- Sends POST `/api/submissions/{id}/feedback`
- Modal closes and toast shows success
- Queue refreshes automatically

- "Reject" button opens modal
- Modal accepts rejection reason
- Sends POST `/api/submissions/{id}/reject`
- Modal closes and toast shows confirmation
- Queue refreshes automatically

**Component:** `ApprovalModal` in `apps/web/src/components/ApprovalModal.tsx`
- Reusable modal for feedback and rejection
- Type-specific button labels and placeholders
- Auto-clears on submit
- Handles backdrop click (closes modal)

**Test Coverage:**
- Feedback modal display and submission
- Rejection modal display and submission
- Toast notifications
- Modal auto-close
- Queue refresh after actions
- API endpoint integration
- Success/error states

### Issue #12: Approval - Pending Review & Override
**Location:** `apps/web/src/pages/ApprovalDetail.tsx`

**Features:**
- "Mark for Review" button transitions submission to PENDING_REVIEW
- Sends POST `/api/submissions/{id}/pending-review`
- Queue shows "Under review by [reviewer name]"
- Any other admin can still approve (override mechanism)
- Override logged to audit trail

- "Approve" button available to all admins
- Sends POST `/api/submissions/{id}/approve`
- Post transitions to PUBLISHED state
- Toast confirms approval

**Test Coverage:**
- Mark for review state transition
- Queue display update with reviewer info
- Override approval by different admin
- Approve action success
- Toast notifications

### Issue #13: Post Lifecycle - Edit & Re-approval
**Location:** `apps/web/src/hooks/usePostManagement.ts` and tests

**Features:**
- `editPost(postId, updates)` method
- Sends PATCH `/api/posts/{id}`
- Post transitions to SUBMITTED state
- Revision count increments
- Audit trail records revision

**Hook:** `usePostManagement()` provides:
- `fetchPost(postId)` - Get post by ID
- `editPost(postId, updates)` - Edit and re-submit
- `revokePost(postId, data)` - Revoke published post
- `archivePost(postId)` - Archive post
- `fetchArchivedPosts()` - Get all archived posts
- `fetchFeedPosts()` - Get feed posts (excludes archived)

**Test Coverage:**
- Post fetch
- Edit submission (POST to SUBMITTED)
- Revision history tracking
- State transitions
- Error handling

### Issue #14: Post Lifecycle - Revoke & Archive
**Location:** `apps/web/src/pages/ArchiveView.tsx` and tests

**Features:**
- Revoke button on published posts (admin only)
- Revoke modal with reason textarea
- Sends POST `/api/posts/{id}/revoke`
- Removes from feed immediately
- Toast confirms revoke

- Archive button on posts (admin only)
- Sends POST `/api/posts/{id}/archive`
- Transitions to ARCHIVED state
- Excluded from regular feed

- ArchiveView page shows archived posts only
- Displays all ARCHIVED state posts
- Shows author and date info
- ARCHIVED status badge

**Test Coverage:**
- Revoke submission with reason
- Archive submission
- Feed exclusion (revoked and archived)
- ArchiveView display
- Empty archive handling
- Error states

## File Structure

```
apps/web/src/
├── pages/
│   ├── Approval.tsx               (Issue #10 - Dashboard)
│   ├── Approval.test.tsx
│   ├── ApprovalDetail.tsx         (Issues #11-12 - Detail/Actions)
│   ├── ApprovalDetail.test.tsx
│   ├── ArchiveView.tsx            (Issue #14 - Archive)
│   ├── ArchiveView.test.tsx
│   ├── ApprovalWorkflow.integration.test.tsx  (Issues #10-12 workflow)
│   ├── PostLifecycle.integration.test.tsx     (Issues #13-14 workflow)
│   ├── Feed.tsx
│   ├── Feed.test.tsx
│   ├── CreatePost.tsx
│   └── CreatePost.test.tsx
├── components/
│   ├── ApprovalModal.tsx          (Reusable modal component)
│   ├── ApprovalModal.test.tsx
│   ├── ProtectedRoute.tsx
│   ├── ProtectedRoute.test.tsx
│   └── ...
├── hooks/
│   ├── useApprovalQueue.ts        (Issue #10 - Queue management)
│   ├── useApprovalQueue.test.ts
│   ├── usePostManagement.ts       (Issues #13-14 - Post lifecycle)
│   ├── usePostManagement.test.ts
│   ├── useAuth.ts
│   ├── useAuth.test.ts
│   └── ...
├── context/
│   ├── AuthContext.tsx
│   └── ...
└── services/
    └── ...
```

## API Integration

### Approval Queue Endpoints
- **GET `/api/submissions/queue`** - Fetch pending approval queue (ADMIN only)
- **GET `/api/submissions/{id}`** - Fetch submission details (ADMIN only)

### Submission Actions
- **POST `/api/submissions/{id}/feedback`** - Send feedback (ADMIN only)
  - Body: `{ message: string }`
- **POST `/api/submissions/{id}/reject`** - Reject submission (ADMIN only)
  - Body: `{ reason: string }`
- **POST `/api/submissions/{id}/pending-review`** - Mark for review (ADMIN only)
- **POST `/api/submissions/{id}/approve`** - Approve submission (ADMIN only)
  - Body: `{ audience?: string }`
- **POST `/api/submissions/{id}/override`** - Override rejection (ADMIN only)
  - Body: `{ reason: string, audience?: string }`

### Post Lifecycle Endpoints
- **GET `/api/posts/{id}`** - Fetch post (creator or admin)
- **PATCH `/api/posts/{id}`** - Edit post (creator only)
  - Body: `{ text: string }`
  - State transition: PUBLISHED → SUBMITTED
- **POST `/api/posts/{id}/revoke`** - Revoke post (ADMIN only)
  - Body: `{ reason: string }`
  - State transition: PUBLISHED → REVOKED
- **POST `/api/posts/{id}/archive`** - Archive post (ADMIN only)
  - State transition: (any) → ARCHIVED
- **GET `/api/posts/archive?state=ARCHIVED`** - Fetch archived posts (ADMIN only)

## Testing Strategy

### Unit Tests
- Component rendering and lifecycle
- Hook state management
- API call validation
- Error handling
- User interaction handling

### Integration Tests
- Full workflow from queue to approval
- State transitions across components
- Queue refresh after actions
- Post lifecycle workflows
- UI state consistency

### Test Files
1. `Approval.test.tsx` - Dashboard tests (Issue #10)
2. `ApprovalDetail.test.tsx` - Detail and actions (Issues #11-12)
3. `ApprovalModal.test.tsx` - Modal component
4. `useApprovalQueue.test.ts` - Hook tests
5. `usePostManagement.test.ts` - Post management hook
6. `ArchiveView.test.tsx` - Archive page (Issue #14)
7. `ApprovalWorkflow.integration.test.tsx` - Full approval flow
8. `PostLifecycle.integration.test.tsx` - Full post lifecycle

## Key Design Decisions

### 1. Hooks Over Components for Logic
- `useApprovalQueue` manages queue fetching and sorting
- `usePostManagement` handles all post lifecycle operations
- Components focus on presentation and user interaction

### 2. Reusable Modal Component
- `ApprovalModal` handles both feedback and rejection
- Reduces code duplication
- Easy to extend for other modal types

### 3. State Management
- Use React hooks for local component state
- Lift shared state when needed
- Queue refresh on detail close ensures sync

### 4. Error Handling
- User-friendly error messages
- Toast notifications for success
- Loading states during async operations
- Graceful degradation on network errors

### 5. Access Control
- Route protection via `ProtectedRoute` with `requiredRole`
- Admin-only buttons hidden from non-admins
- API enforces role checks server-side

## Component Responsibilities

### Approval (Dashboard)
- Display queue of pending submissions
- Show status badges
- Navigate to detail view
- Refresh queue when detail closes

### ApprovalDetail
- Display submission details
- Provide action buttons (feedback, reject, mark for review, approve)
- Open appropriate modals for actions
- Show toast notifications
- Handle API calls and state updates

### ApprovalModal
- Generic modal for text input (feedback/rejection)
- Different labels/placeholders based on type
- Validate input (non-empty)
- Disable submit when empty

### ArchiveView
- Display all archived posts
- Show post details (author, date, content)
- Handle empty state
- Error handling

## Testing Approach

### TDD Workflow for Each Issue
1. Write comprehensive test suite (RED)
2. Implement minimal code to pass tests (GREEN)
3. Refactor for code quality (REFACTOR)
4. Commit with descriptive message

### Test Organization
- Unit tests verify individual component/hook behavior
- Integration tests verify workflows across components
- Mock fetch for API calls
- Verify toast notifications and state transitions

## Future Enhancements

1. **Pagination** - Paginate large approval queues
2. **Search/Filter** - Filter queue by author, date, status
3. **Real-time Updates** - WebSocket for live queue updates
4. **Bulk Actions** - Approve/reject multiple at once
5. **Comments** - Inline comments on submissions
6. **Revision Diff** - Show changes in edited posts
7. **Scheduled Publish** - Schedule posts for future publication
8. **Analytics** - Track approval metrics and trends

## Commits

### Commit 1: Phase 3 Approval Workflow Frontend
- All core implementations for Issues #10-14
- Comprehensive test suites
- Hook-based state management

### Commit 2: Refactor with ApprovalModal
- Extract modal logic into reusable component
- Add integration tests
- Improve code reuse

## Verification Checklist

- [x] All test files created with comprehensive coverage
- [x] All component files created with minimal implementation
- [x] All hook files created for business logic
- [x] API endpoints integrated correctly
- [x] Role-based access control enforced
- [x] State transitions working as designed
- [x] Toast notifications showing properly
- [x] Queue sorting by submission date
- [x] Detail view navigation working
- [x] Modal dialogs functional
- [x] Integration workflows tested
- [x] Error handling implemented
- [x] Loading states displayed
- [x] Code committed to git

## Notes

- All components follow React best practices
- Proper TypeScript types throughout
- Consistent error handling patterns
- Toast notifications for user feedback
- Loading states prevent UI clutter
- Mobile-friendly component structure
- Accessibility considerations (tabIndex, roles)
