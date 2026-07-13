# Domain Glossary: Bosch Internal Communications Platform

## People & Roles

**Comms Officer**
A designated communications representative per department. Only role that can create posts. Submits content to Admin for approval and distribution decision.

**Admin**
A member of the central comms team responsible for reviewing, approving, and distributing content. Can also revoke published content. Only role that can access audit trails and engagement analytics.

**Employee**
Any Bosch employee. Consumes published content via web browser or mobile app. Can like, comment, and share posts. Cannot create content or see governance/analytics.

## Content & Workflow

**Post**
A piece of content (text, rich formatting, images, videos, documents) created by a Comms Officer and submitted for approval.

**Draft**
A post that has not been submitted for approval. Comms Officer can edit freely. Not visible to any other user.

**Approval Workflow**
The process: Comms Officer submits → Admin reviews → Admin decides (approve/reject/feedback). If feedback given, post returns to draft; Comms Officer can revise and resubmit. If rejected, post cannot be resubmitted. If approved, post is published with chosen audience scope.

**Approval Queue**
Shared queue visible to all Admins. Shows all pending submissions awaiting review.

**Pending Review State**
A submission assigned to an Admin for second opinion before approval decision. Other Admins can see it's under review and add comments. Does not count as "approved" until the reviewing Admin makes a final decision.

**Admin Override**
When Admin A rejected a post and Admin B approves it anyway (e.g., Admin A is unavailable). Creates audit trail entry. Necessary for business continuity.

**Published Content**
Post that has been approved and distributed to its audience scope. Visible to employees in that audience. Immutable by Comms Officer (any edits require re-approval). Revocable by any Admin.

**Revocation**
Removal of published content from the feed. Content disappears entirely (no "[revoked]" badge shown to users). Recorded in immutable audit trail.

**Audience Scope**
Which employees see a post. Comms Officer proposes; Admin can modify. Types:
- **Organization-wide:** all employees
- **Department-only:** only employees in the source department
- **Custom audience:** specific groups/teams (e.g., "Leadership", "Project X Team", cross-department initiatives)

## Engagement

**Like/Reaction**
Quick engagement on a post (e.g., emoji reactions). Any employee can like/react. Displayed as count only. No moderation needed.

**Comment**
Text response to a post. Any employee can comment. Authors can self-delete. Admins can delete any comment. Deletions recorded in audit trail.

**Share**
Forward a post link to other employees (internal-only). Logged in audit trail.

## Archive & Lifecycle

**Auto-Archive**
Posts older than 1 year are moved to archive (no longer appear in main feed). Still searchable and audit-visible.

**Immutable Audit Trail**
Permanent append-only log of all actions: submissions, approvals, rejections, feedback, overrides, publications, revocations, edits, comments, likes, shares, deletions. Retained for 3 years. Only Admins can view. Cannot be modified or deleted.

## Data & Visibility

**Department**
User's primary organizational unit. Determines default content visibility. Users can belong to multiple custom audiences but have one primary department.

**Custom Audience**
Admin-created group spanning one or more departments (e.g., "Leadership", "Remote Workers", "Project A Team"). Comms Officers can propose content for custom audiences their department is part of.

**Engagement Dashboard**
Admin-only daily view of post metrics: likes, comments, shares, reach (count of unique users who viewed). Updated daily, not real-time.

**Audit Trail View**
Admin-only interface showing immutable log of all system actions with timestamps, actors, and details.

## Technical Constraints

**Single Codebase**
One React web application runs on web browsers, desktop, and mobile (iOS/Android via Capacitor). No separate native codebases.

**Read-Only Mobile**
Mobile app (iOS/Android) via Capacitor is consumption-only for employees. All governance, approval, and management happens via web browser.

**CosmosDB**
Document database storing all posts, comments, users, audit logs, and analytics. No separate backup/disaster recovery for MVP.

**GDPR Compliance**
Only department and engagement counts visible to Admins. No personal data (names, email, detailed roles) shown to Admins or employees. Users identified by department only in the UI.
