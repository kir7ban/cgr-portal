# Issue #17: AuditTrailService - Quick Reference

**Status:** ✅ Complete  
**Service Location:** `/apps/api/src/advanced/audit.service.ts`  
**Tests Location:** `/apps/api/src/advanced/audit.service.spec.ts`  
**Full Spec:** `ISSUE_17_AUDITTRAILSERVICE_SPEC.md`

---

## Core Method: `getAuditTrail()`

```typescript
async getAuditTrail(
  userId: string,
  pagination: PaginationParams,
  filters?: AuditFilterOptions
): Promise<PaginatedAuditResponse>
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | Admin user ID (checked against hard-coded admin list) |
| `pagination.page` | number | Yes | 1-based page number (must be ≥ 1) |
| `pagination.pageSize` | number | Yes | Items per page (1-100, default 20 recommended) |
| `filters.dateFrom` | string | No | ISO 8601 start date (inclusive, e.g., "2026-07-01T00:00:00Z") |
| `filters.dateTo` | string | No | ISO 8601 end date (inclusive) |
| `filters.actor` | string | No | User/service ID who performed the action (exact match) |
| `filters.action` | string | No | Action type (exact match, e.g., "POST_APPROVED") |

### Returns

```typescript
interface PaginatedAuditResponse {
  entries: AuditEntry[];      // Current page of audit entries
  totalCount: number;         // Total entries matching filters
  pageNumber: number;         // Current page (1-based)
  pageSize: number;           // Items per page
  totalPages: number;         // Total pages available
  hasNextPage: boolean;       // More pages?
  hasPreviousPage: boolean;   // Previous page?
}
```

### Exceptions

| Exception | HTTP Status | Condition |
|-----------|-------------|-----------|
| `ForbiddenException` | 403 | Non-admin user |
| `BadRequestException` | 400 | Invalid pagination/filter params |
| `Error` | 500 | Database not connected |

### Quick Examples

**Get first page:**
```typescript
await auditTrailService.getAuditTrail('admin', { page: 1, pageSize: 50 })
```

**Filter by date range:**
```typescript
await auditTrailService.getAuditTrail('admin', { page: 1, pageSize: 20 }, {
  dateFrom: '2026-07-01T00:00:00Z',
  dateTo: '2026-07-13T23:59:59Z'
})
```

**Filter by actor:**
```typescript
await auditTrailService.getAuditTrail('admin', { page: 1, pageSize: 20 }, {
  actor: 'alice.smith'
})
```

**Filter by action:**
```typescript
await auditTrailService.getAuditTrail('admin', { page: 1, pageSize: 20 }, {
  action: 'POST_APPROVED'
})
```

**All filters combined:**
```typescript
await auditTrailService.getAuditTrail('admin', { page: 1, pageSize: 20 }, {
  dateFrom: '2026-07-01T00:00:00Z',
  dateTo: '2026-07-13T23:59:59Z',
  actor: 'alice.smith',
  action: 'POST_APPROVED'
})
```

---

## Data Model: AuditEntry

```typescript
interface AuditEntry {
  id: string;              // Unique ID (UUID-based)
  timestamp: string;       // ISO 8601 UTC timestamp
  actor: string;          // User/service who performed action
  action: string;         // Action type (e.g., POST_APPROVED)
  resource: string;       // Resource type (e.g., post, comment)
  resourceId?: string;    // ID of affected resource
}
```

### Common Action Types

| Action | Description |
|--------|-------------|
| `POST_CREATED` | Post created in draft state |
| `POST_SUBMITTED` | Post submitted for approval |
| `POST_APPROVED` | Post approved and published |
| `POST_REJECTED` | Post rejected (no resubmit) |
| `POST_FEEDBACK` | Admin sent post back for revision |
| `POST_OVERRIDE_APPROVED` | Admin overrode rejection |
| `POST_EDITED` | Published post edited |
| `POST_REVOKED` | Post revoked by admin |
| `COMMENT_ADDED` | Comment created |
| `COMMENT_DELETED` | Comment deleted |
| `REACTION_ADDED` | Like/reaction added |
| `REACTION_REMOVED` | Like/reaction removed |
| `SHARE_POST` | Post shared with recipients |

---

## Features

### Filtering
- ✅ Date range (inclusive on both ends)
- ✅ Actor (user/service who performed action)
- ✅ Action type (action category)
- ✅ All filters combine with AND logic
- ✅ All filters optional and independent

### Pagination
- ✅ Page-based offset pagination
- ✅ Page numbers start at 1 (not 0)
- ✅ Max 100 items per page
- ✅ Navigation metadata included
- ✅ Efficient slicing (doesn't load all results)

### Sorting
- ✅ Chronological by timestamp
- ✅ Newest entries first (descending order)
- ✅ Stable sorting (maintains order for same timestamp)

### Access Control
- ✅ Admin-only access
- ✅ MVP: Hard-coded admin list
- ✅ Throws ForbiddenException for non-admins

### Immutability
- ✅ Append-only design
- ✅ No updates allowed
- ✅ No deletes allowed
- ✅ Enforced at service and database level

---

## Validation Rules

### Pagination Validation
- `page` must be integer ≥ 1
- `pageSize` must be integer 1-100
- Both required (cannot be null/undefined)

### Filter Validation
- `dateFrom` must be valid ISO 8601 if provided
- `dateTo` must be valid ISO 8601 if provided
- `actor` must be non-empty string if provided
- `action` must be non-empty string if provided
- Whitespace-only strings rejected

### Error Messages
```
"Only admins can access audit trail" → ForbiddenException
"Page must be a positive integer" → BadRequestException
"PageSize cannot exceed 100" → BadRequestException
"Invalid dateFrom format, must be ISO 8601" → BadRequestException
"Actor must be a non-empty string" → BadRequestException
"Action must be a non-empty string" → BadRequestException
```

---

## Admin Users (MVP)

Hard-coded admin identifiers:
- `'admin'`
- `'admin@bosch.com'`

**Production:** Replace with Azure Entra RBAC

---

## Usage in Other Services

### ApprovalService
```typescript
await auditTrailService.addAuditEntry({
  id: 'audit-' + uuid(),
  timestamp: new Date().toISOString(),
  actor: adminId,
  action: 'POST_APPROVED',
  resource: 'post',
  resourceId: postId
});
```

### EditService, RevocationService, etc.
Similar pattern: call `addAuditEntry()` with appropriate action and resource.

---

## Response Examples

### Successful Response (200 OK)
```json
{
  "entries": [
    {
      "id": "audit-001",
      "timestamp": "2026-07-13T15:30:00Z",
      "actor": "alice.smith",
      "action": "POST_APPROVED",
      "resource": "post",
      "resourceId": "post-123"
    },
    {
      "id": "audit-002",
      "timestamp": "2026-07-13T14:20:00Z",
      "actor": "admin",
      "action": "COMMENT_DELETED",
      "resource": "comment",
      "resourceId": "comment-456"
    }
  ],
  "totalCount": 42,
  "pageNumber": 1,
  "pageSize": 50,
  "totalPages": 1,
  "hasNextPage": false,
  "hasPreviousPage": false
}
```

### Error: Unauthorized (403 Forbidden)
```json
{
  "statusCode": 403,
  "message": "Only admins can access audit trail"
}
```

### Error: Invalid Params (400 Bad Request)
```json
{
  "statusCode": 400,
  "message": "PageSize cannot exceed 100"
}
```

---

## Performance

### Complexity
- Time: O(n) where n = total audit entries
- Space: O(k) where k = page size ≤ 100
- Sorting: O(n log n) per query

### MVP Limits
- Up to 10K entries: < 2 MB memory
- Suitable for < 1 year of audit data

### Production Scaling
- CosmosDB with indexes on `/timestamp`, `/actor`, `/action`
- Partition by `/timestamp` for time-series distribution
- 500K+ entries supported with proper indexing

---

## Test Coverage

**60+ tests** covering:
- ✅ Admin access control (5 tests)
- ✅ Pagination (15+ tests)
- ✅ Sorting (3 tests)
- ✅ Date range filtering (15+ tests)
- ✅ Actor filtering (6 tests)
- ✅ Action filtering (6 tests)
- ✅ Combined filtering (4 tests)
- ✅ Immutability (2 tests)

Run tests: `npm test -- --testPathPattern="audit.service.spec"`

---

## Deployment

1. ✅ Service implemented and tested
2. ✅ Specification complete
3. ✅ Ready for code review
4. ✅ Ready for integration testing
5. ⏳ Ready for production deployment

**Next:** Integrate with ApprovalService and build Admin UI

---

## Related Issues

- Issue #5-7: Approval actions (logs to audit trail)
- Issue #10: Post editing (logs to audit trail)
- Issue #11: Post revocation (logs to audit trail)
- Issue #12: Comments (logs to audit trail)
- Issue #13: Post sharing (logs to audit trail)

---

## Key Files

| File | Purpose |
|------|---------|
| `/apps/api/src/advanced/audit.service.ts` | Service implementation |
| `/apps/api/src/advanced/audit.service.spec.ts` | 60+ test cases |
| `ISSUE_17_AUDITTRAILSERVICE_SPEC.md` | Full specification |
| `ISSUE_17_IMPLEMENTATION_SUMMARY.md` | Implementation details |
| `ISSUE_17_AUDITTRAILSERVICE_QUICK_REFERENCE.md` | This file |

---

## Support

For detailed information, see:
- **Specification:** `ISSUE_17_AUDITTRAILSERVICE_SPEC.md`
- **Implementation:** `ISSUE_17_IMPLEMENTATION_SUMMARY.md`
- **Code:** `/apps/api/src/advanced/audit.service.ts`
- **Tests:** `/apps/api/src/advanced/audit.service.spec.ts`
