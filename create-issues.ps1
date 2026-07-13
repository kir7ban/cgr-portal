# Script to create all 22 vertical slice issues for Bosch Internal Communications Platform
# Run this from your local machine with GitHub CLI authenticated
# Usage: powershell -ExecutionPolicy Bypass -File create-issues.ps1

$REPO = "kir7ban/cgr-portal"

# Issue 1: Auth & Role System
gh issue create --repo $REPO `
  --title "Auth & Role System" `
  --body "## What to build

Implement mock SSO login and role-based access control for the internal communications platform.

End-to-end behavior:
- Users can login with mock credentials (Comms Officer, Admin, Employee roles)
- Role assignment is hardcoded for MVP (in-app config, not tied to external directory)
- Permission middleware enforces which roles can access which endpoints
- Different roles see different UI based on permissions

## Acceptance criteria

- [ ] Mock SSO endpoint implemented (returns JWT or session token)
- [ ] Three roles assignable: Employee, Comms Officer, Admin
- [ ] Permission middleware validates role on protected endpoints
- [ ] Tests: can login as each role, unauthorized roles get 403
- [ ] Tests: API endpoints enforce role requirements

## Blocked by

None - can start immediately" `
  --label "ready-for-agent"

# Issue 2: Database Schema & Immutable Audit Infrastructure
gh issue create --repo $REPO `
  --title "Database Schema & Immutable Audit Infrastructure" `
  --body "## What to build

Design and implement CosmosDB schema for all data storage (posts, comments, reactions, users, audit logs) with append-only audit collection enforcement.

End-to-end behavior:
- All collections defined and documented
- Audit collection enforces immutability at application level (no deletes/updates allowed)
- Connection to Azure CosmosDB functional
- Data integrity ensured across all collections

## Acceptance criteria

- [ ] CosmosDB schema design document (collections, indexes, partition keys)
- [ ] All collections created and indexed appropriately
- [ ] Audit collection defined with append-only application-level enforcement
- [ ] Connection string configured
- [ ] Tests: can insert and read from all collections
- [ ] Tests: audit collection rejects delete/update operations

## Blocked by

None - can start immediately" `
  --label "ready-for-agent"

# Issue 3: Post Content Model
gh issue create --repo $REPO `
  --title "Post Content Model" `
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

- [ ] Post schema includes content types (text, images, videos, documents)
- [ ] Media upload endpoints validate file size and type
- [ ] Draft posts stored in database, retrievable by creator only
- [ ] Rich text parsing/validation implemented
- [ ] Tests: media validation (size, type, count limits)
- [ ] Tests: draft CRUD operations

## Blocked by

#2" `
  --label "ready-for-agent"

# Issue 4: Post Creation & Submission
gh issue create --repo $REPO `
  --title "Post Creation & Submission" `
  --body "## What to build

Implement end-to-end post creation and submission workflow for Comms Officers.

End-to-end behavior:
- Comms Officer creates draft posts (API and UI)
- Comms Officer proposes audience scope (org-wide, dept-only, custom)
- Comms Officer submits draft for approval (state transition to Submitted)
- Submission enters admin approval queue
- Audit logs submission event

## Acceptance criteria

- [ ] POST /api/posts endpoint creates draft (Comms Officer only)
- [ ] Draft is stored in database with creator user ID
- [ ] POST /api/posts/{id}/submit endpoint transitions to Submitted state
- [ ] Audience scope proposal captured at submission
- [ ] Submission audit event created (timestamp, actor, action)
- [ ] Tests: draft creation, submission state transition, audit logging
- [ ] Tests: non-Comms Officers cannot create/submit

## Blocked by

#1, #2, #3" `
  --label "ready-for-agent"

# Issue 5: Admin Approval Flow
gh issue create --repo $REPO `
  --title "Admin Approval Flow" `
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

- [ ] GET /api/approvals returns shared queue visible to all Admins
- [ ] POST /api/approvals/{id}/approve publishes post with final scope
- [ ] POST /api/approvals/{id}/reject marks post as rejected (no resubmit)
- [ ] POST /api/approvals/{id}/feedback returns to draft, allows revision
- [ ] Approval/rejection audit events created with decision details
- [ ] Tests: all three approval paths, state transitions, scope override
- [ ] Tests: only Admins can approve; non-Admins get 403

## Blocked by

#4" `
  --label "ready-for-agent"

# Issue 6: Admin Override
gh issue create --repo $REPO `
  --title "Admin Override" `
  --body "## What to build

Implement Admin override capability: if Admin A rejects a post, Admin B can approve it anyway for business continuity.

End-to-end behavior:
- Admin B sees post was rejected by Admin A
- Admin B can approve anyway (overriding the rejection)
- Override action creates audit trail entry with both admins' identities
- Post becomes Published with final audience scope

## Acceptance criteria

- [ ] Approval queue shows post rejection reason and rejecting admin
- [ ] Admin B can call approval endpoint to override rejection
- [ ] Override audit event includes original admin, overriding admin, timestamp
- [ ] Tests: override permissions checked, audit trail contains override
- [ ] Tests: only Admins can override

## Blocked by

#5" `
  --label "ready-for-agent"

# Issue 7: Pending Review State
gh issue create --repo $REPO `
  --title "Pending Review State" `
  --body "## What to build

Implement pending review state: Admins can mark a submission for second opinion before making a final decision.

End-to-end behavior:
- Admin A marks submission as 'pending review'
- All Admins see submission flagged 'under review by [Admin A]'
- Admins can add comments to the submission
- Admin A (or another Admin) makes final decision (approve, reject, feedback)
- All comments and decision logged in audit trail

## Acceptance criteria

- [ ] Submission can be marked 'pending review' with Admin assignee
- [ ] Approval queue shows pending review status and assigned admin name
- [ ] Admins can add comments to pending submissions
- [ ] Final decision path same as normal approval (approve, reject, feedback)
- [ ] Audit events logged for pending review, comments, and final decision
- [ ] Tests: pending review state transitions, comment visibility, decision enforcement

## Blocked by

#5" `
  --label "ready-for-agent"

# Issue 8: Published Feed & Audience Filtering
gh issue create --repo $REPO `
  --title "Published Feed & Audience Filtering" `
  --body "## What to build

Implement employee feed with audience-based filtering and pagination.

End-to-end behavior:
- Employees fetch published feed (GET /api/posts)
- Feed returns only Published posts visible to user's audience
- Audience determined by: department (primary), custom groups (secondary)
- Feed is chronological (newest first) and paginated
- Only Published posts shown (no drafts, submitted posts, revoked posts)

## Acceptance criteria

- [ ] GET /api/posts returns paginated published posts
- [ ] Feed filtered by user's audience (dept + custom groups)
- [ ] Revoked posts excluded from feed
- [ ] Pagination working (limit, offset/cursor)
- [ ] Chronological sort (newest first)
- [ ] Tests: audience filtering accuracy, pagination, state filtering
- [ ] Tests: only Published posts visible

## Blocked by

#5 (need Published posts)" `
  --label "ready-for-agent"

# Issue 9: Custom Audiences (Admin CRUD)
gh issue create --repo $REPO `
  --title "Custom Audiences (Admin CRUD)" `
  --body "## What to build

Implement admin management of custom audiences (groups spanning departments).

End-to-end behavior:
- Admin creates custom audiences (name, description, type)
- Admin adds/removes users from audiences
- Admin lists all custom audiences with membership counts
- Custom audiences used for distribution scope in approval workflow

## Acceptance criteria

- [ ] POST /api/audiences creates custom audience (Admin only)
- [ ] PATCH /api/audiences/{id} updates audience (Admin only)
- [ ] POST /api/audiences/{id}/members adds user to audience
- [ ] DELETE /api/audiences/{id}/members/{userId} removes user
- [ ] GET /api/audiences lists all custom audiences with membership
- [ ] Tests: create, read, update, delete, membership management
- [ ] Tests: only Admins can manage audiences

## Blocked by

#2, #8" `
  --label "ready-for-agent"

# Issue 10: Audience Scope at Approval
gh issue create --repo $REPO `
  --title "Audience Scope at Approval" `
  --body "## What to build

Implement audience scope selection during admin approval: Comms Officer proposes, Admin can modify and finalize.

End-to-end behavior:
- Comms Officer proposes audience when submitting (org-wide, dept-only, custom)
- Admin reviews proposal and can accept or change scope
- Admin finalizes scope at approval (broaden, narrow, or swap custom groups)
- Final scope governs who sees published post

## Acceptance criteria

- [ ] Submission includes Comms Officer's proposed scope
- [ ] Approval endpoints accept final scope parameter
- [ ] Admin can override scope (approve with different scope than proposed)
- [ ] Published post visibility matches final scope
- [ ] Audit trail shows proposed vs final scope
- [ ] Tests: scope proposal, override, final enforcement
- [ ] Tests: visibility matches final scope

## Blocked by

#9" `
  --label "ready-for-agent"

# Issue 11: Likes/Reactions
gh issue create --repo $REPO `
  --title "Likes/Reactions" `
  --body "## What to build

Implement emoji reactions on published posts with engagement counting.

End-to-end behavior:
- Employees like/react to published posts (emoji reactions)
- Reactions displayed as count per emoji on post
- Employees can remove their own reactions
- Reaction events logged in audit trail

## Acceptance criteria

- [ ] POST /api/posts/{id}/reactions creates reaction (Employee)
- [ ] DELETE /api/posts/{id}/reactions/{reactionId} removes reaction
- [ ] Reactions aggregated and displayed as counts (not per-user list)
- [ ] Audit logged: reaction added/removed with emoji type
- [ ] Tests: create, remove, count aggregation
- [ ] Tests: only Employees can react (not Admins/Comms Officers on behalf of others)

## Blocked by

#8" `
  --label "ready-for-agent"

# Issue 12: Comments
gh issue create --repo $REPO `
  --title "Comments" `
  --body "## What to build

Implement text comments on published posts with author/admin deletion.

End-to-end behavior:
- Employees post text comments on published posts
- Comments displayed in order (chronological)
- Comment author can delete own comment
- Admin can delete any comment
- Deletions logged in audit trail with reason (if provided)

## Acceptance criteria

- [ ] POST /api/posts/{id}/comments creates comment (Employee)
- [ ] GET /api/posts/{id}/comments returns paginated comments (chronological)
- [ ] DELETE /api/posts/{id}/comments/{commentId} removes comment (author or Admin)
- [ ] Audit logged: comment created, deleted (with deleter identity)
- [ ] Tests: create, read, delete (author), delete (admin)
- [ ] Tests: only comment author or Admin can delete

## Blocked by

#8" `
  --label "ready-for-agent"

# Issue 13: Share (Internal)
gh issue create --repo $REPO `
  --title "Share (Internal)" `
  --body "## What to build

Implement internal post sharing: employees forward post links to other employees.

End-to-end behavior:
- Employees share published post links to other employees (internal-only)
- Share event logged in audit trail (sharer, shared-to users, timestamp)
- No external sharing (no public links, no external email)

## Acceptance criteria

- [ ] POST /api/posts/{id}/share forwards post link internally
- [ ] Share endpoint accepts list of recipient user IDs
- [ ] Share audit event created (sharer, recipients, timestamp)
- [ ] Tests: share endpoint, audit logging
- [ ] Tests: only internal sharing allowed (no external)

## Blocked by

#8" `
  --label "ready-for-agent"

# Issue 14: Post Editing (Published)
gh issue create --repo $REPO `
  --title "Post Editing (Published)" `
  --body "## What to build

Implement editing of published posts with re-approval workflow and revision history.

End-to-end behavior:
- Comms Officer edits published post (text, media)
- Edit sends post back to Submitted state (requires re-approval)
- Full revision history maintained in audit trail
- Admins see all revisions and can compare before re-approving

## Acceptance criteria

- [ ] PATCH /api/posts/{id} on published post triggers re-approval
- [ ] Post transitions to Submitted state with original + revised content
- [ ] Revision history stored in audit trail (who edited, when, what changed)
- [ ] Tests: edit triggers re-approval, revisions tracked, audit logging
- [ ] Tests: only Comms Officer can edit (creator)

## Blocked by

#5, #8" `
  --label "ready-for-agent"

# Issue 15: Post Revocation
gh issue create --repo $REPO `
  --title "Post Revocation" `
  --body "## What to build

Implement admin revocation of published posts: remove from feed immediately with audit trail.

End-to-end behavior:
- Admin revokes any published post
- Post disappears from employee feed immediately
- Revocation logged in audit trail (admin, timestamp, revocation reason if provided)
- No '[revoked]' badge shown to users (clean removal)

## Acceptance criteria

- [ ] POST /api/posts/{id}/revoke removes post from feed (Admin only)
- [ ] Post state set to Revoked (not deleted, preserves audit history)
- [ ] Revocation audit event created (revoking admin, timestamp)
- [ ] Tests: revoke removes from feed, audit logged
- [ ] Tests: only Admins can revoke

## Blocked by

#8" `
  --label "ready-for-agent"

# Issue 16: Post Auto-Archive
gh issue create --repo $REPO `
  --title "Post Auto-Archive" `
  --body "## What to build

Implement automatic archival of posts older than 1 year.

End-to-end behavior:
- Daily batch job identifies posts older than 1 year
- Archived posts removed from main feed
- Archived posts still searchable/viewable in archive section
- Archive state recorded in audit trail (timestamp, batch id)

## Acceptance criteria

- [ ] Batch job runs daily (scheduled or cron-based)
- [ ] Posts older than 1 year transitioned to Archived state
- [ ] Archived posts excluded from main feed
- [ ] Separate archive view shows archived posts
- [ ] Audit event created for batch archive operations
- [ ] Tests: date-based archival logic, feed filtering, archive visibility

## Blocked by

#8" `
  --label "ready-for-agent"

# Issue 17: Audit Trail UI (Admin)
gh issue create --repo $REPO `
  --title "Audit Trail UI (Admin)" `
  --body "## What to build

Implement admin interface for viewing and searching immutable audit logs.

End-to-end behavior:
- Admin views all audit trail events (immutable append-only log)
- Searchable by date range, actor (user), action type
- Filterable by event type (submission, approval, override, revocation, comment, reaction, share)
- Paginated, chronological view (newest first)
- Shows: timestamp, actor, action, affected resource, details

## Acceptance criteria

- [ ] GET /api/audit returns audit trail (Admin only)
- [ ] Query parameters: date_from, date_to, actor, action_type, limit, offset
- [ ] Search/filter working and accurate
- [ ] UI displays all required fields (timestamp, actor, action, details)
- [ ] Pagination working
- [ ] Tests: audit trail accuracy, search/filter correctness

## Blocked by

All phases (reads from audit trail)" `
  --label "ready-for-agent"

# Issue 18: Analytics Dashboard (Admin)
gh issue create --repo $REPO `
  --title "Analytics Dashboard (Admin)" `
  --body "## What to build

Implement admin analytics dashboard with daily engagement metrics and submission analytics.

End-to-end behavior:
- Admin views daily engagement dashboard (updated once per day, not real-time)
- Per-post metrics: likes, comments, shares, reach (count of unique viewers)
- Engagement trends over time
- Submission metrics: volume per day, average approval time
- All data aggregated from audit trail

## Acceptance criteria

- [ ] GET /api/analytics/dashboard returns daily metrics (Admin only)
- [ ] Per-post metrics calculated: likes, comments, shares, unique viewers
- [ ] Engagement trends showing historical data
- [ ] Submission volume and approval time metrics
- [ ] Daily aggregation batch job (not real-time updates)
- [ ] Tests: metric calculation accuracy, aggregation logic
- [ ] Tests: only Admins can view

## Blocked by

#11, #12, #13, #14, #15, #16" `
  --label "ready-for-agent"

# Issue 19: Mobile Feed (Capacitor)
gh issue create --repo $REPO `
  --title "Mobile Feed (Capacitor)" `
  --body "## What to build

Implement mobile app (iOS/Android via Capacitor) with read-only feed consumption.

End-to-end behavior:
- Capacitor wraps React web app for iOS and Android
- Mobile app displays published feed (same filtering as web)
- Employees can like, comment, share from mobile
- Mobile cannot create posts, view audit, or approve (read-only)
- Native mobile user experience (safe area, gestures)

## Acceptance criteria

- [ ] Capacitor configured for iOS and Android builds
- [ ] Mobile feed displays published posts (same filtering as web)
- [ ] Like, comment, share functionality working on mobile
- [ ] Post creation, approval, audit endpoints disabled on mobile (403 or hidden UI)
- [ ] E2E tests on Capacitor runtime (Playwright)
- [ ] Safe area handling, mobile-optimized layout

## Blocked by

#1, #2, #8, #11, #12, #13" `
  --label "ready-for-agent"

# Issue 20: Mobile Offline Caching
gh issue create --repo $REPO `
  --title "Mobile Offline Caching" `
  --body "## What to build

Implement offline caching on mobile: cache last 50 posts per department for offline reading.

End-to-end behavior:
- Mobile app caches up to 50 most recent posts per department
- Offline mode displays cached posts (read-only)
- Cache synced when connection restored
- Stale data indicated (last sync timestamp)

## Acceptance criteria

- [ ] Service worker or indexedDB caches posts locally
- [ ] Cache limited to 50 posts per department
- [ ] Offline mode functional (displays cached posts)
- [ ] Sync on reconnection (fetch new posts)
- [ ] Last sync timestamp displayed in UI
- [ ] Tests: offline fetch, sync on reconnect, cache limits

## Blocked by

#19" `
  --label "ready-for-agent"

# Issue 21: Azure Deployment Setup
gh issue create --repo $REPO `
  --title "Azure Deployment Setup" `
  --body "## What to build

Provision and configure Azure infrastructure: App Service and CosmosDB.

End-to-end behavior:
- Azure App Service created (Node.js runtime, static asset serving)
- CosmosDB instance provisioned (400-1000 RU/s for MVP)
- Network connectivity configured (app → database)
- Connection strings securely configured
- Health check endpoint functional

## Acceptance criteria

- [ ] Azure App Service provisioned and running
- [ ] CosmosDB provisioned (400-1000 RU/s)
- [ ] Connection strings configured (env vars)
- [ ] Health check endpoint returns 200 OK
- [ ] App Service can access CosmosDB
- [ ] Documentation: provisioning steps, scaling guide

## Blocked by

None - can start immediately" `
  --label "ready-for-agent"

# Issue 22: GitHub Actions CI/CD Pipeline
gh issue create --repo $REPO `
  --title "GitHub Actions CI/CD Pipeline" `
  --body "## What to build

Implement GitHub Actions workflow for build, test, and deployment to Azure.

End-to-end behavior:
- On push to main: build (npm/yarn), test (Jest + Playwright), deploy to Azure
- On pull request: build and test (no deploy)
- Workflow runs NestJS backend build, React frontend build, all tests
- Failed builds block PR merge
- Successful builds auto-deploy to Azure App Service

## Acceptance criteria

- [ ] .github/workflows/ci-cd.yml created and configured
- [ ] Build job: Node dependencies, compile backend + frontend
- [ ] Test job: Jest unit tests, Playwright E2E tests
- [ ] Deploy job: push to Azure App Service (main only)
- [ ] PR checks required before merge
- [ ] Deployment logs accessible
- [ ] Rollback procedure documented

## Blocked by

#21" `
  --label "ready-for-agent"

Write-Host "✅ All 22 issues created successfully!"
