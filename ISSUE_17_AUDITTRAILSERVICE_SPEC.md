# Issue #17: AuditTrailService Implementation Specification

**Status:** Complete  
**Date:** 2026-07-13  
**Component:** Advanced Features Module - Audit Trail Management  

---

## Overview

The **AuditTrailService** provides admin-only access to immutable audit trail entries with comprehensive filtering and pagination capabilities. Administrators can query the audit log to investigate compliance events, track approval workflows, and monitor governance across the platform.

### Key Features
- ✓ Admin-only read access to complete audit trail
- ✓ Date range filtering (dateFrom, dateTo)
- ✓ Actor filtering (user/service ID who performed the action)
- ✓ Action type filtering (POST_APPROVED, COMMENT_DELETED, etc.)
- ✓ Offset-based pagination with configurable page sizes
- ✓ Chronological sorting (newest first)
- ✓ Validation of all filter and pagination parameters
- ✓ 3-year retention compliance ready

---

## Functional Requirements

### FR-1: Audit Trail Retrieval
**Requirement:** Admins can retrieve audit trail entries with optional filtering.

- Retrieve paginated audit trail entries
- Admin-only access (enforced via role check)
- Support pagination with page number and page size (1-100 items)
- Returns total count, page metadata, and has-next/has-previous flags
- Sort chronologically (newest first) by timestamp

**Related Requirement:** REQUIREMENTS.md § "Audit & Compliance → Immutable Audit Trail"

### FR-2: Date Range Filtering
**Requirement:** Admins can filter audit entries by date range.

- Filter by dateFrom (ISO 8601, inclusive)
- Filter by dateTo (ISO 8601, inclusive)
- Both filters optional and can be used independently
- Timestamps compared at millisecond precision
- Reject invalid date formats with BadRequestException

**Related Requirement:** REQUIREMENTS.md § "Audit & Compliance → Immutable Audit Trail"

### FR-3: Actor Filtering
**Requirement:** Admins can filter audit entries by actor (user who performed the action).

- Filter by actor (exact match, user/service ID)
- Support filtering by any admin, comms officer, or system service
- Case-sensitive matching
- Return empty result if no entries match the actor
- Reject empty actor strings with BadRequestException

**Related Requirement:** REQUIREMENTS.md § "Governance & Access Control"

### FR-4: Action Type Filtering
**Requirement:** Admins can filter audit entries by action type.

- Filter by action (exact match, e.g., POST_APPROVED, COMMENT_DELETED)
- Support all action types logged in the system
- Case-sensitive matching
- Return empty result if no entries match the action
- Reject empty action strings with BadRequestException

**Related Requirement:** REQUIREMENTS.md § "Audit & Compliance → Immutable Audit Trail"

### FR-5: Pagination
**Requirement:** Audit trail results are paginated for performance.

- Implement offset-based pagination (page-based, not cursor-based)
- Page numbering starts at 1 (not 0)
- Page size range: 1-100 items (default: 20 recommended)
- Return pagination metadata: page number, page size, total pages
- Return navigation flags: hasNextPage, hasPreviousPage
- Reject invalid page numbers (<1) or page sizes (>100)

**Related Requirement:** REQUIREMENTS.md § "Scale & Performance"

### FR-6: Access Control
**Requirement:** Audit trail access is restricted to admins only.

- Enforce admin-only access via role check
- Throw ForbiddenException if non-admin user requests audit trail
- Support future integration with Azure Entra admin roles
- MVP uses hard-coded admin list for testing

**Related Requirement:** REQUIREMENTS.md § "Governance & Access Control"

### FR-7: Immutability
**Requirement:** Audit trail is append-only and immutable.

- No update operations allowed on audit entries
- No delete operations allowed on audit entries
- Only append (insert) operations via addAuditEntry()
- Enforced at application level (database service prevents updates/deletes)
- Retained for 3 years per compliance requirements

**Related Requirement:** REQUIREMENTS.md § "Audit & Compliance → Immutable Audit Trail"

---

## Technical Specification

### Service Class: AuditTrailService

**Location:** `/apps/api/src/advanced/audit.service.ts`

**Module:** AdvancedModule

**Dependencies:**
- `DatabaseService` - for audit entry persistence
- `@nestjs/common` - for dependency injection and exceptions

### Data Models

#### AuditEntry
```typescript
interface AuditEntry {
  id: string;              // Unique audit entry ID (UUID-based)
  timestamp: string;       // ISO 8601 timestamp (UTC)
  actor: string;          // User/service ID who performed the action
  action: string;         // Action type (e.g., POST_APPROVED, COMMENT_DELETED)
  resource: string;       // Resource type (e.g., post, comment, user)
  resourceId?: string;    // ID of the resource affected
}
```

#### AuditFilterOptions
```typescript
interface AuditFilterOptions {
  dateFrom?: string;      // ISO 8601 date (inclusive), e.g., "2026-07-01T00:00:00Z"
  dateTo?: string;        // ISO 8601 date (inclusive), e.g., "2026-07-13T23:59:59Z"
  actor?: string;         // Filter by user/service ID (exact match)
  action?: string;        // Filter by action type (exact match)
}
```

#### PaginationParams
```typescript
interface PaginationParams {
  page: number;           // 1-based page number (must be >= 1)
  pageSize: number;       // Items per page (1-100)
}
```

#### PaginatedAuditResponse
```typescript
interface PaginatedAuditResponse {
  entries: AuditEntry[];           // Array of audit entries for current page
  totalCount: number;              // Total number of entries matching filters
  pageNumber: number;              // Current page number (1-based)
  pageSize: number;                // Items per page
  totalPages: number;              // Total number of pages
  hasNextPage: boolean;            // true if there are more pages
  hasPreviousPage: boolean;        // true if there are previous pages
}
```

### Method Signatures

#### getAuditTrail()
```typescript
async getAuditTrail(
  userId: string,
  pagination: PaginationParams,
  filters?: AuditFilterOptions
): Promise<PaginatedAuditResponse>
```

**Public API for retrieving audit trail entries.**

**Parameters:**
- `userId` - User requesting the audit trail (must be admin)
- `pagination` - Pagination parameters (page, pageSize)
- `filters` - Optional filter options (dateFrom, dateTo, actor, action)

**Returns:**
- `PaginatedAuditResponse` with entries, pagination metadata, and navigation flags

**Throws:**
- `ForbiddenException` if user is not an admin
- `BadRequestException` if pagination params are invalid (page < 1, pageSize > 100)
- `BadRequestException` if filter params are invalid (invalid date format, empty strings)
- `Error` if database is not connected

**Behavior:**
1. Enforce admin-only access
2. Validate pagination parameters
3. Fetch all audit entries from database
4. Apply optional filters (date range, actor, action)
5. Sort chronologically (newest first) by timestamp
6. Slice to page boundaries
7. Return paginated response with metadata

**Example Usage:**
```typescript
// Get first page of audit trail (50 items per page)
const response = await auditTrailService.getAuditTrail('admin', {
  page: 1,
  pageSize: 50
});

// Get audit entries for specific date range
const response = await auditTrailService.getAuditTrail('admin', {
  page: 1,
  pageSize: 20
}, {
  dateFrom: '2026-07-01T00:00:00Z',
  dateTo: '2026-07-13T23:59:59Z'
});

// Get audit entries by specific actor
const response = await auditTrailService.getAuditTrail('admin', {
  page: 1,
  pageSize: 20
}, {
  actor: 'alice.smith'
});

// Get audit entries for specific action
const response = await auditTrailService.getAuditTrail('admin', {
  page: 1,
  pageSize: 20
}, {
  action: 'POST_APPROVED'
});

// Combine multiple filters
const response = await auditTrailService.getAuditTrail('admin', {
  page: 1,
  pageSize: 20
}, {
  dateFrom: '2026-07-01T00:00:00Z',
  dateTo: '2026-07-13T23:59:59Z',
  actor: 'alice.smith',
  action: 'POST_APPROVED'
});
```

#### addAuditEntry() (Internal Use)
```typescript
async addAuditEntry(entry: AuditEntry): Promise<AuditEntry>
```

**Internal API for logging actions (used by other services).**

**Parameters:**
- `entry` - Audit entry to append to the trail

**Returns:**
- The audit entry that was added

**Throws:**
- `Error` if database is not connected

**Behavior:**
1. Persist entry to database (immutable append)
2. Maintain in-memory copy for MVP
3. Prevent any updates or deletes

**Note:** This is an internal method used by other services (ApprovalService, EditService, etc.) to log actions. Public API access to the audit trail is read-only.

### Sorting & Pagination

**Chronological Sorting:**
- Entries sorted by timestamp in descending order (newest first)
- All timestamps are ISO 8601 UTC
- Millisecond precision supported for precise event ordering

**Pagination Strategy:**
- Offset-based pagination (traditional page-based approach)
- Page numbers start at 1 (not 0)
- Page size limited to 100 items maximum
- Total count calculated after applying all filters
- Enables cursor-based pagination in future if needed

### Error Handling

**ForbiddenException (403):**
- Thrown when non-admin user requests audit trail
- Message: "Only admins can access audit trail"

**BadRequestException (400):**
- Invalid page number: "Page must be a positive integer"
- Invalid page size: "PageSize must be a positive integer"
- Page size too large: "PageSize cannot exceed 100"
- Pagination params missing: "Pagination params required"
- Invalid date format: "Invalid dateFrom format, must be ISO 8601"
- Invalid date format: "Invalid dateTo format, must be ISO 8601"
- Empty actor string: "Actor must be a non-empty string"
- Empty action string: "Action must be a non-empty string"

**Error (500):**
- Database not connected: "Database not connected"

### Validation Rules

**Pagination Validation:**
- Page must be integer >= 1
- PageSize must be integer >= 1 and <= 100
- Both required (cannot be undefined or null)

**Filter Validation:**
- dateFrom must be valid ISO 8601 if provided
- dateTo must be valid ISO 8601 if provided
- actor must be non-empty string if provided
- action must be non-empty string if provided
- All filters are optional

**Date Range Validation:**
- Both dateFrom and dateTo are inclusive
- dateFrom can be used without dateTo and vice versa
- Invalid dates throw BadRequestException immediately

---

## Integration Points

### DatabaseService
- `insertAudit(entry: AuditEntry)` - Append audit entry (immutable)
- `isConnected()` - Check database connection status

### Other Services (Logging)
Services that log actions call `AuditTrailService.addAuditEntry()`:
- ApprovalService (POST_APPROVED, POST_REJECTED, POST_FEEDBACK, etc.)
- EditService (POST_EDITED)
- RevocationService (POST_REVOKED)
- CommentService (COMMENT_DELETED)
- ReactionService (REACTION_ADDED, REACTION_REMOVED)
- ShareService (SHARE_POST)

---

## Audit Trail Actions

Common audit trail action types logged in the system:

| Action | Actor | Resource | Notes |
|--------|-------|----------|-------|
| POST_CREATED | Comms Officer | post | Post created in draft state |
| POST_SUBMITTED | Comms Officer | post | Post submitted for approval |
| POST_APPROVED | Admin | post | Post approved and published |
| POST_REJECTED | Admin | post | Post rejected (cannot be resubmitted) |
| POST_FEEDBACK | Admin | post | Admin sent post back for revision |
| POST_OVERRIDE_APPROVED | Admin | post | Admin overrode previous rejection |
| POST_EDITED | Comms Officer | post | Published post edited |
| POST_REVOKED | Admin | post | Published post revoked by admin |
| POST_ARCHIVED | System | post | Post auto-archived after 1 year |
| COMMENT_ADDED | Employee | comment | Comment created on post |
| COMMENT_DELETED | (Author or Admin) | comment | Comment deleted |
| REACTION_ADDED | Employee | reaction | Like/reaction added to post |
| REACTION_REMOVED | Employee | reaction | Like/reaction removed |
| SHARE_POST | Employee | share | Post shared with recipients |
| PENDING_REVIEW_MARKED | Admin | submission | Admin marked submission for review |

---

## Testing Strategy

### Unit Tests

#### Test: Admin Access Control
- ✓ Non-admin user rejected with ForbiddenException
- ✓ Admin user accepted and returns audit trail
- ✓ MVP hard-coded admins work correctly

#### Test: Pagination
- ✓ Page 1 returns first pageSize items
- ✓ Page 2 returns next batch
- ✓ Last page contains remaining items
- ✓ Pagination metadata correct (totalPages, hasNextPage, etc.)
- ✓ Page < 1 rejected with BadRequestException
- ✓ PageSize > 100 rejected with BadRequestException
- ✓ PageSize = 0 rejected with BadRequestException
- ✓ Missing pagination params rejected

#### Test: Date Range Filtering
- ✓ dateFrom filter inclusive (entries >= dateFrom)
- ✓ dateTo filter inclusive (entries <= dateTo)
- ✓ Both dateFrom and dateTo work together
- ✓ dateFrom without dateTo includes all entries after date
- ✓ dateTo without dateFrom includes all entries before date
- ✓ Invalid date format (dateFrom) throws BadRequestException
- ✓ Invalid date format (dateTo) throws BadRequestException

#### Test: Actor Filtering
- ✓ Filter by actor returns matching entries only
- ✓ Empty result if no entries match actor
- ✓ Empty actor string rejected with BadRequestException
- ✓ Case-sensitive matching works correctly

#### Test: Action Filtering
- ✓ Filter by action returns matching entries only
- ✓ Empty result if no entries match action
- ✓ Empty action string rejected with BadRequestException
- ✓ Case-sensitive matching works correctly

#### Test: Combined Filtering
- ✓ Multiple filters applied together (AND logic)
- ✓ Date range + actor filter
- ✓ Date range + action filter
- ✓ Actor + action filter
- ✓ All filters combined

#### Test: Sorting
- ✓ Results sorted by timestamp descending (newest first)
- ✓ Multiple entries same timestamp maintain insertion order

#### Test: Immutability
- ✓ addAuditEntry() persists to database
- ✓ Entries cannot be modified (enforced by DatabaseService)
- ✓ Entries cannot be deleted (enforced by DatabaseService)

### Integration Tests

#### Test: Approval Service Integration
- ✓ Approval action logged when post approved
- ✓ Rejection action logged when post rejected
- ✓ Feedback action logged when feedback sent
- ✓ Override approval logged with reason

#### Test: Edit Service Integration
- ✓ Edit action logged when published post edited

#### Test: Multiple Actions
- ✓ Query all entries for a specific post across all actions
- ✓ Query all entries by a specific admin
- ✓ Query all entries for a specific action type

---

## Performance Considerations

### Scaling
- Current MVP: In-memory storage (suitable for <10K entries)
- Production: CosmosDB with proper indexing on timestamp, actor, action
- Recommended indexes: `/timestamp`, `/actor`, `/action`
- Partition key: `/timestamp` (for time-series data distribution)

### Query Performance
- Filtering done in-memory for MVP (< 100ms for 10K entries)
- Production should use database-level filtering
- Pagination reduces memory load (50-item pages recommended)
- Date range filtering most selective filter (apply first)

### Storage
- Audit entry ~200-500 bytes
- 100 posts/day * 5 actions average = 500 entries/day
- 500 * 365 = 182,500 entries/year
- 3-year retention = ~550K entries (~110-275 MB depending on detail level)
- Well within CosmosDB storage limits

---

## Future Enhancements

### Phase 2 (Post-MVP)
- Cursor-based pagination for better performance on large datasets
- Full-text search across audit entries
- Audit entry export (CSV, JSON)
- Retention policy automation (auto-delete after 3 years)
- Real-time audit log subscription (WebSocket)
- Advanced filtering (multiple actors, multiple actions with OR logic)
- Audit dashboard with charts and trends
- Bulk operations filtering
- Differential auditing (show changes between versions)

### Phase 3 (Production)
- Azure Entra role integration (RBAC)
- Encryption at rest for audit logs
- Immutable blob storage backup
- Audit log signing/hash verification
- Event streaming to external SIEM
- Alert rules on specific audit events
- Forensic analysis tools

---

## Deployment Checklist

- [ ] Code review completed
- [ ] Unit tests passing (>90% coverage)
- [ ] Integration tests passing
- [ ] DatabaseService audit methods tested
- [ ] ForbiddenException error handling verified
- [ ] BadRequestException validation tested
- [ ] Pagination edge cases tested (page 1, last page, single item)
- [ ] Date filtering with millisecond precision verified
- [ ] Performance tested with 10K+ audit entries
- [ ] Documentation updated
- [ ] Audit trail populated with sample data
- [ ] Admin UI for audit trail querying implemented
- [ ] Deployed to Azure App Service
- [ ] Smoke tests passed in staging
- [ ] Production deployment completed

---

## Related Issues

- Issue #3: Role-Based Approval Workflow (Audit Logging)
- Issue #5-7: Post Approval Actions (Generates Audit Trail)
- Issue #10: Post Editing & Re-submission (Generates Audit Trail)
- Issue #11: Post Revocation (Generates Audit Trail)
- Issue #12: Comments & Deletion (Generates Audit Trail)
- Issue #13: Post Sharing (Generates Audit Trail)

---

## References

- **REQUIREMENTS.md**: "Audit & Compliance" section
- **ADR-0003**: "CosmosDB with Immutable Append-Only Audit Logs"
- **FeedService**: Example of pagination implementation
- **ApprovalService**: Example of audit logging integration
