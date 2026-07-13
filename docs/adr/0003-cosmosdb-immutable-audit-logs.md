# ADR 0003: CosmosDB with Immutable Append-Only Audit Logs

**Date:** 2026-07-13  
**Status:** Accepted

## Context

Bosch's internal communications platform requires strict governance and compliance, specifically:

- **3-year audit retention** for regulatory/compliance reasons
- **Immutable audit trail** to prevent tampering or accidental deletion
- **Full action logging** (submissions, approvals, overrides, revocations, edits, comments, likes, shares)
- **Admin-only access** to audit data

Technology choices:
1. **CosmosDB** (document store, flexible schema) for posts, comments, users, + audit logs together
2. **Separate audit store** (e.g., Azure Table Storage, separate CosmosDB) with immutable write-only access
3. **SQL Database** with triggers and strict schema for audit immutability

## Decision

We chose **CosmosDB for all data (posts, comments, users, audit logs) with immutable append-only audit collection**.

## Rationale

| Criterion | CosmosDB All-In-One | Separate Audit Store | SQL Database |
|-----------|-------------------|-------------------|--------------|
| Flexibility (semi-structured posts/comments) | ✓ Excellent | ✓ Good | ~ Fair (requires schema migrations) |
| Audit immutability | ✓ Feasible (app-level enforcement) | ✓ Better (by design) | ✓ Good (triggers) |
| Simplicity for MVP | ✓ Single database to manage | ~ Adds operational complexity | ~ More schema planning |
| CosmosDB cost | ✓ All-in-one (economies of scale) | ~ Extra instance cost | N/A |
| Query flexibility | ✓ High (JSON queries) | ✓ High | ✓ High |

**Key decision:** Immutability enforced at **application level** (no deletes on audit collection), not database level. Simpler for MVP, sufficient if code is trustworthy.

## Consequences

**Positive:**
- Single database simplifies operations (one backup policy, one scaling strategy)
- CosmosDB's document model fits social content naturally (posts, comments are documents)
- All data in one place makes correlating events easier
- Cost-effective for MVP scale

**Negative:**
- Audit immutability relies on code discipline (no database-level enforcement)
- CosmosDB is semi-structured; requires careful schema design for audit trail consistency
- If app code has a bug, audit logs can be corrupted (mitigated by code review and tests)

## Audit Collection Schema

Audit logs are stored as immutable documents in a dedicated `auditLogs` collection:

```json
{
  "id": "audit-<uuid>",
  "timestamp": "2026-07-13T10:30:00Z",
  "actor": "admin@bosch.com",
  "action": "POST_APPROVED",
  "details": {
    "postId": "post-123",
    "audience": "organization-wide",
    "reason": null
  }
}
```

**Rules enforced at application level:**
- No update or delete operations on `auditLogs` collection
- Only append (insert) allowed
- Admin-only read access to entire collection
- Retention: 3 years (manual archival process, not automatic)

## Alternatives Considered

- **Separate immutable store (Azure Table Storage):** Adds operational complexity; overkill for MVP.
- **SQL with audit triggers:** Stricter immutability, but over-engineered for MVP and less flexible for semi-structured content.
- **CosmosDB + separate audit (different region):** Higher cost, adds replication complexity.
