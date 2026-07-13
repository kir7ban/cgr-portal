# Bosch Internal Communications Platform — Requirements Summary

**Date:** 2026-07-13  
**Status:** Converged (from grill-with-docs session)

## Overview

A **web-based social media platform for Bosch's internal communications department**, with strict governance over content approval, distribution, and audit trails. Cross-platform (web browser, laptop, mobile apps) from a single React codebase, deployed on Azure.

---

## Functional Requirements

### Content Creation & Submission

- **Only Comms Officers can create posts** (one per department)
- Posts include: text (rich formatting), images (max 5MB, 3 per post), videos (linked only), documents (max 10MB)
- Comms Officers submit posts to Admins for approval (not directly published)
- Posts are initially in **Draft** state (visible only to creator)
- Comms Officers propose **audience scope** when submitting (Admin can override)

### Approval Workflow

**Two-stage approval:**

1. **Comms Officer submits** → post enters approval queue
2. **Admin reviews** and selects one of:
   - **Approve** → post published with chosen audience scope
   - **Reject** → post cannot be resubmitted
   - **Send feedback** → post returns to draft; Comms Officer can revise and resubmit

**Revisions after feedback:**
- Comms Officer revises and resubmits
- Revised post goes through full approval again (same or different Admin)
- Full audit trail of revisions maintained

**Admin override for business continuity:**
- If Admin A rejected a post and Admin B disagrees, Admin B can override (approve anyway)
- Override creates audit trail entry (action, actor, timestamp)
- Enables continuity if Admin A is unavailable

**Pending review state:**
- Admin can mark a submission as "pending review" before deciding
- Visible to all Admins with flag "under review by [Admin name]"
- Allows collaborative decision-making with shared comments

### Content Distribution

**Audience scope types:**

1. **Organization-wide** — visible to all employees
2. **Department-only** — visible only to department members
3. **Custom audience** — visible to specific groups (e.g., "Leadership", "Project X Team")

**Scope decision:**
- Comms Officer proposes audience; Admin can broaden/narrow
- Admin has final say on distribution
- A department can propose org-wide; Admin must approve

### Published Content & Edits

**Published posts are mutable (with re-approval):**
- Comms Officer can edit published posts
- Edits send post back to approval queue (treated as new submission)
- Admins review changes and re-approve (same workflow)
- Full revision history in audit trail

**Revocation (only Admins):**
- Any Admin can revoke any published post
- Revoked content disappears from feed entirely (no "[revoked]" badge to users)
- Revocation recorded immutably in audit trail

### Employee Engagement

**Employees can interact with published posts:**
- **Like/React:** emoji reactions, counted only (no moderation)
- **Comment:** text responses; authors can self-delete; Admins can delete any comment (logged in audit)
- **Share:** forward post link to other employees (internal-only, logged in audit)

**Read-only on mobile:**
- Mobile app (iOS/Android via Capacitor) is consumption-only
- All creation, approval, management happens on web browser

### Content Lifespan

- Posts visible indefinitely in main feed
- Auto-archive after 1 year (moved to archive, no longer in feed; still searchable)
- Employees can view historical/archived posts

---

## Governance & Access Control

### Roles & Permissions

| Role | Create | Submit | Approve | Revoke | Edit Published | View Audit | View Analytics |
|------|--------|--------|---------|--------|-----------------|-----------|-----------------|
| Employee | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Comms Officer | ✓ | ✓ | ✗ | ✗ | ✓ (w/ re-approval) | ✗ | ✗ |
| Admin | ✗ | ✗ | ✓ | ✓ | ✗ | ✓ | ✓ |

### Authentication & Authorization

- **MVP:** Mock SSO (hard-coded roles for testing)
- **Production:** Azure Entra SSO with role provisioning
- Roles: Comms Officer (by department), Admin (central team), Employee (default)
- Role assignment in-app (custom role/group system, not tied to external directory for MVP)
- Users can belong to multiple custom audiences

### Data Visibility & GDPR Compliance

**Only department & engagement counts visible:**
- Employees see: only their own posts, comments, likes (no personal data of others)
- Comms Officers see: only their submissions + status
- Admins see: all submissions, all audit logs, all analytics
- **No personal data shown to Admins** (no names, emails, detailed roles)
- Users identified by department only in UI

**Audit logs access:**
- Admin-only read access
- Cannot view who specifically read a post (engagement = count of unique viewers only)

---

## Audit & Compliance

### Immutable Audit Trail

**All events logged:**
- Post submissions, approvals, rejections, feedback requests
- Revisions and re-approvals
- Admin overrides (with reason)
- Post publication and revocation
- Comment creation, edits, deletions
- Likes/reactions
- Shares
- Role/permission changes

**Audit log properties:**
- Immutable append-only (no deletes, no updates)
- Retained for 3 years
- Timestamp, actor, action, details
- Admin-only read access
- Visible in Admin audit trail UI (searchable, filterable by date/actor/action)

### Analytics Dashboard

**Admin-only daily dashboard:**
- Per-post metrics: likes, comments, shares, reach (count of unique viewers)
- Engagement trends
- Submission volume, approval time
- Updated daily (not real-time)
- No data export for MVP

---

## Technical Specification

### Architecture

**Frontend:**
- React + TypeScript
- Capacitor wrapper for iOS/Android (read-only mobile app)
- Redux for state management
- Vite for build/bundling
- Offline caching on mobile (last 50 posts per department)

**Backend:**
- Node.js + NestJS
- REST API
- Mock auth for MVP (production: Azure Entra)

**Database:**
- Azure CosmosDB (all data: posts, comments, users, audit logs)
- No separate backup/disaster recovery for MVP
- Audit logs in dedicated immutable collection

**Deployment:**
- Azure App Service (single instance, hosts API + static React frontend)
- GitHub Actions for CI/CD
- Mock SSO for MVP

### API Endpoints (High-Level)

**Posts:**
- `POST /api/posts` — create draft (Comms Officer only)
- `PATCH /api/posts/{id}` — edit draft or revise published (Comms Officer only)
- `POST /api/posts/{id}/submit` — submit for approval
- `GET /api/posts` — fetch feed (filtered by user audience)
- `GET /api/posts/{id}` — fetch single post details

**Approvals:**
- `GET /api/approvals` — approval queue (Admin only)
- `POST /api/approvals/{id}/approve` — approve submission
- `POST /api/approvals/{id}/reject` — reject submission
- `POST /api/approvals/{id}/feedback` — send back for revision
- `POST /api/approvals/{id}/pending-review` — mark for second opinion

**Comments:**
- `POST /api/posts/{id}/comments` — post comment (Employee)
- `DELETE /api/posts/{id}/comments/{commentId}` — delete comment (author or Admin)

**Reactions:**
- `POST /api/posts/{id}/reactions` — like/react (Employee)
- `DELETE /api/posts/{id}/reactions/{reactionId}` — remove like

**Shares:**
- `POST /api/posts/{id}/share` — share to users

**Audit:**
- `GET /api/audit` — audit trail (Admin only)

**Analytics:**
- `GET /api/analytics/dashboard` — daily dashboard metrics (Admin only)

---

## Scale & Performance

- **Users:** 5,000-10,000 employees, 20-30 Comms Officers, 5 Admins
- **Content volume:** 50-100 posts/day, 5-10 comments/post
- **Feed load time:** <2s (acceptable for enterprise)
- **Real-time engagement:** Reactions/comments appear immediately (eventual consistency OK)
- **CosmosDB throughput:** 400-1000 RU/s for MVP

---

## Out of Scope (MVP)

- Push notifications
- External social media integration
- User profiles/bios
- Mentions (@username)
- Search (basic filtering sufficient)
- Real-time collaboration (comment typing indicators)
- Video uploads (linked only)
- Session security (add in production)
- Data export
- Monitoring/alerting
- Backup & disaster recovery
- SOC 2 Type II compliance (plan for later)
