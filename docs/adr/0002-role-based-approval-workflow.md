# ADR 0002: Role-Based Approval Workflow with Admin Override

**Date:** 2026-07-13  
**Status:** Accepted

## Context

Internal communications at Bosch requires governance over who can publish content and to whom. Different post types require different approval levels:

- Company-wide announcements (leadership messages, policy changes) need strict vetting
- Department updates need faster turnaround
- Event notifications can be lighter touch

A single approval level (all posts same process) would be either too restrictive or too lenient.

## Decision

We implemented a **role-based approval workflow** where:

1. **Comms Officers** (one per department) create and submit posts
2. **Admins** review and decide: approve, reject, or request feedback
3. **Approval is role-based, not post-type based:** All posts follow the same workflow, but Admin has authority to approve/reject based on content judgment
4. **Admin can override:** If Admin A rejects and Admin B believes it should be approved (e.g., Admin A unavailable), Admin B can override with audit trail
5. **Admins decide distribution scope:** Even if Comms Officer proposes audience, Admin has final say

## Rationale

- **Simplicity:** Single approval flow for all content (no complex routing logic)
- **Flexibility:** Admin can adapt approval strictness to content type without changing the system
- **Accountability:** All approvals/overrides logged immutably
- **Business continuity:** Override mechanism prevents one Admin blocking content indefinitely
- **Governance:** Admins (not Comms Officers) control audience, reducing risk of mis-scoped content

## Consequences

**Positive:**
- Clear audit trail: every approval/override recorded with actor, timestamp, reason
- No content gets stuck if approver is unavailable (override available)
- Admins can adapt to edge cases without system changes

**Negative:**
- All Admins see all submissions (privacy concern mitigated: Admins can't see personal data, only department)
- Override power is significant; requires trust in Admin team

## Alternatives Considered

- **Hierarchical approval:** Different routes for different post types (e.g., "company-wide" requires C-level sign-off, "department" requires manager). Adds complexity; not needed for MVP.
- **No override:** Admin A's rejection is final. Creates bottlenecks if Admin is unavailable. Not acceptable.
- **Comms Officers control distribution:** Reduces governance. Posts from departments could be scoped org-wide inappropriately.
