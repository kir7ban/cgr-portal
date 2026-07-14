#!/bin/bash
REPO="kir7ban/cgr-portal"

# Issue 1: Auth & Role System
gh issue create --repo $REPO \
  --title "Auth & Role System" \
  --body "## What to build

Implement mock SSO login and role-based access control for the internal communications platform.

End-to-end behavior:
- Users can login with mock credentials (Comms Officer, Admin, Employee roles)
- Role assignment is hardcoded for MVP (in-app config, not tied to external directory)
- Permission middleware enforces which roles can access which endpoints
- Different roles see different UI based on permissions

## Acceptance criteria

- [x] Mock SSO endpoint implemented (returns JWT or session token)
- [x] Three roles assignable: Employee, Comms Officer, Admin
- [x] Permission middleware validates role on protected endpoints
- [x] Tests: can login as each role, unauthorized roles get 403
- [x] Tests: API endpoints enforce role requirements

## Blocked by

None - can start immediately

## Status: COMPLETED

**Implemented in**: Commits b1d6ad2, 57b93d0" \
  --label "ready-for-agent"

# Issue 2: Database Schema & Immutable Audit Infrastructure
gh issue create --repo $REPO \
  --title "Database Schema & Immutable Audit Infrastructure" \
  --body "## What to build

Design and implement CosmosDB schema for all data storage (posts, comments, reactions, users, audit logs) with append-only audit collection enforcement.

End-to-end behavior:
- All collections defined and documented
- Audit collection enforces immutability at application level (no deletes/updates allowed)
- Connection to Azure CosmosDB functional
- Data integrity ensured across all collections

## Acceptance criteria

- [x] CosmosDB schema design document (collections, indexes, partition keys)
- [x] All collections created and indexed appropriately
- [x] Audit collection defined with append-only application-level enforcement
- [x] Connection string configured
- [x] Tests: can insert and read from all collections
- [x] Tests: audit collection rejects delete/update operations

## Blocked by

None - can start immediately

## Status: COMPLETED

**Implemented in**: Commits 9ff7299, 57b93d0" \
  --label "ready-for-agent"

# Issue 3: Post Content Model
gh issue create --repo $REPO \
  --title "Post Content Model" \
  --body "## What to build

Implement the Post data model with support for rich content (text, images, videos, documents) and media constraints.

End-to-end behavior:
- Posts store text with rich formatting support (bold, italic, links, lists)
- Posts can include up to 3 images (max 5MB each)
- Posts can link to videos (YouTube, internal video service, no uploads)
- Posts can link to documents (max 10MB, common formats only)
- Posts start in Draft state, visible only to creator
- Media validation enforces constraints before storage

## Acceptance criteria

- [x] Post schema includes content types (text, images, videos, documents)
- [x] Media upload endpoints validate file size and type
- [x] Draft posts stored in database, retrievable by creator only
- [x] Rich text parsing/validation implemented
- [x] Tests: media validation (size, type, count limits)
- [x] Tests: draft CRUD operations

## Blocked by

#2

## Status: COMPLETED

**Implemented in**: Commits a8dba8d, 57b93d0" \
  --label "ready-for-agent"

# Issue 4: Post Creation & Submission
gh issue create --repo $REPO \
  --title "Post Creation & Submission" \
  --body "## What to build

Implement end-to-end post creation and submission workflow for Comms Officers.

End-to-end behavior:
- Comms Officer creates draft posts (API and UI)
- Comms Officer proposes audience scope (org-wide, dept-only, custom)
- Comms Officer submits draft for approval (state transition to Submitted)
- Submission enters admin approval queue
- Audit logs submission event

## Acceptance criteria

- [x] POST /api/posts endpoint creates draft (Comms Officer only)
- [x] Draft is stored in database with creator user ID
- [x] POST /api/posts/{id}/submit endpoint transitions to Submitted state
- [x] Audience scope proposal captured at submission
- [x] Submission audit event created (timestamp, actor, action)
- [x] Tests: draft creation, submission state transition, audit logging
- [x] Tests: non-Comms Officers cannot create/submit

## Blocked by

#1, #2, #3

## Status: COMPLETED

**Implemented in**: Commits ef581e7, a8dba8d, 57b93d0" \
  --label "ready-for-agent"

# Issue 5: Admin Approval Flow
gh issue create --repo $REPO \
  --title "Admin Approval Flow" \
  --body "## What to build

Implement admin approval workflow: Admins can approve, reject, or request feedback on submitted posts with full audit trail.

End-to-end behavior:
- Admin views approval queue of all submitted posts
- Admin can approve (post → Published, audience scope finalized)
- Admin can reject (post → Draft, cannot be resubmitted)
- Admin can request feedback (post → Draft, can revise and resubmit)
- Admin proposes or overrides audience scope at approval
- All decisions logged in audit trail

## Acceptance criteria

- [x] GET /api/approvals returns shared queue visible to all Admins
- [x] POST /api/approvals/{id}/approve publishes post with final scope
- [x] POST /api/approvals/{id}/reject marks post as rejected (no resubmit)
- [x] POST /api/approvals/{id}/feedback returns to draft, allows revision
- [x] Approval/rejection audit events created with decision details
- [x] Tests: all three approval paths, state transitions, scope override
- [x] Tests: only Admins can approve; non-Admins get 403

## Blocked by

#4

## Status: COMPLETED

**Implemented in**: Commits a8dba8d, 57b93d0" \
  --label "ready-for-agent"

echo "✅ First 5 issues published successfully!"
