# Issue #12: CommentService Implementation Specification

## Overview

CommentService is a NestJS injectable service that manages comments on posts with the following core features:

- **Create comments** on posts with validation
- **Retrieve comments** with pagination (offset-based)
- **Delete comments** with author/admin authorization
- **Audit logging** for compliance
- **Chronological sorting** (newest first)
- **Helper methods** for admin/testing access

## Architecture

### Storage Model

```
Comments Map:
  commentId → Comment

Comments by Post Index:
  postId → Set<commentId>
```

This two-tier indexing enables:
- O(1) comment lookup by ID
- Efficient post-specific comment retrieval
- Clean deletion with post association

### Data Structures

#### Comment Interface

```typescript
interface Comment {
  id: string;                // Format: cmt-{timestamp}-{random}
  postId: string;            // Associated post
  userId: string;            // Comment author
  text: string;              // Comment content (1-5000 chars)
  createdAt: string;         // ISO 8601 timestamp
  updatedAt: string;         // ISO 8601 timestamp
}
```

#### PaginationParams

```typescript
interface PaginationParams {
  page: number;              // 1-based page index
  pageSize: number;          // Items per page (1-100)
}
```

#### PaginatedCommentsResponse

```typescript
interface PaginatedCommentsResponse {
  items: Comment[];          // Comments for this page
  totalCount: number;        // Total comments on post
  pageNumber: number;        // Current page
  pageSize: number;          // Items per page
  totalPages: number;        // Total pages
  hasNextPage: boolean;      // Has more pages
  hasPreviousPage: boolean;  // Has previous pages
}
```

## Public API

### addComment(postId, userId, text): Promise<Comment>

Creates a new comment on a post.

**Parameters:**
- `postId` (string): Post ID to comment on
- `userId` (string): User creating the comment
- `text` (string): Comment text (1-5000 characters)

**Returns:** Created Comment object

**Validation Rules:**
- postId: required, non-empty string
- userId: required, non-empty string
- text: required, non-empty, max 5000 chars
- All inputs are trimmed of whitespace

**Exceptions:**
- `BadRequestException`: Missing/invalid inputs, text too long
- Database connection failures are silently handled (audit logging)

**Side Effects:**
- Creates audit entry (action: COMMENT_ADDED)
- Updates post comment index
- Maintains creation timestamp

**Example:**
```typescript
const comment = await commentService.addComment(
  'post-123',
  'user-456',
  'This is a great post!'
);
// Returns: {
//   id: 'cmt-1689123456789-abc123def',
//   postId: 'post-123',
//   userId: 'user-456',
//   text: 'This is a great post!',
//   createdAt: '2024-07-13T10:30:45.123Z',
//   updatedAt: '2024-07-13T10:30:45.123Z'
// }
```

---

### getComments(postId, pagination): Promise<PaginatedCommentsResponse>

Retrieves paginated comments for a post.

**Parameters:**
- `postId` (string): Post to retrieve comments for
- `pagination` (PaginationParams): Pagination params
  - `page`: 1-based page number (>= 1)
  - `pageSize`: Items per page (1-100)

**Returns:** PaginatedCommentsResponse object

**Behavior:**
1. Validates postId and pagination params
2. Retrieves all comments for the post
3. Sorts by createdAt descending (newest first)
4. Applies pagination (offset-based)
5. Returns metadata about pagination

**Pagination Details:**
- Page numbers start at 1
- pageSize limited to 100 items
- Empty posts return totalPages: 1
- hasNextPage: true if current page < totalPages
- hasPreviousPage: true if current page > 1

**Exceptions:**
- `BadRequestException`: Invalid postId, page < 1, pageSize < 1 or > 100

**Example:**
```typescript
const response = await commentService.getComments('post-123', {
  page: 1,
  pageSize: 10
});
// Returns: {
//   items: [
//     { id: 'cmt-1', postId: 'post-123', userId: 'user-1', ... },
//     { id: 'cmt-2', postId: 'post-123', userId: 'user-2', ... },
//   ],
//   totalCount: 42,
//   pageNumber: 1,
//   pageSize: 10,
//   totalPages: 5,
//   hasNextPage: true,
//   hasPreviousPage: false
// }
```

---

### deleteComment(commentId, userId, isAdmin): Promise<{deleted: true}>

Deletes a comment with authorization checks.

**Parameters:**
- `commentId` (string): Comment to delete
- `userId` (string): User requesting deletion
- `isAdmin` (boolean): Whether user is admin

**Returns:** {deleted: true}

**Authorization Rules:**
- Comment author can delete their own comment
- Admin can delete any comment
- Non-author, non-admin cannot delete

**Exceptions:**
- `NotFoundException`: Comment not found
- `ForbiddenException`: User not author or admin
- `BadRequestException`: Missing commentId/userId

**Side Effects:**
- Removes comment from storage
- Updates post comment index
- Creates audit entry (action: COMMENT_DELETED)
- Database failures silently handled

**Example:**
```typescript
// Author deletes own comment
const result = await commentService.deleteComment('cmt-123', 'user-456', false);
// Returns: { deleted: true }

// Admin deletes any comment
const result = await commentService.deleteComment('cmt-123', 'admin-789', true);
// Returns: { deleted: true }

// Non-author cannot delete
await commentService.deleteComment('cmt-123', 'user-999', false);
// Throws: ForbiddenException
```

---

## Helper Methods

### getCommentById(commentId): Promise<Comment | undefined>

Get a single comment by ID.

```typescript
const comment = await commentService.getCommentById('cmt-123');
// Returns: Comment or undefined
```

---

### getCommentCount(postId): Promise<number>

Get total comment count for a post.

```typescript
const count = await commentService.getCommentCount('post-123');
// Returns: 42
```

---

### getAllCommentsRaw(postId): Promise<Comment[]>

Get all comments for a post without pagination (for admin/testing).

```typescript
const comments = await commentService.getAllCommentsRaw('post-123');
// Returns: Comment[]
```

---

## Input Validation Rules

### postId Validation
- Required: must be provided
- Type: string
- Must be non-empty after trimming
- Error: BadRequestException

### userId Validation
- Required: must be provided
- Type: string
- Must be non-empty after trimming
- Case-sensitive (e.g., 'alice' ≠ 'Alice')
- Error: BadRequestException

### text Validation
- Required: must be provided
- Type: string
- Must be non-empty after trimming
- Maximum length: 5000 characters
- Error: BadRequestException if empty or too long

### Pagination Validation
- page: integer >= 1 (required)
- pageSize: integer 1-100 (required)
- Error: BadRequestException for invalid values

---

## Authorization Model

### Comment Deletion

```
User wants to delete comment:
  ├─ Is user the comment author? → YES: Allow
  ├─ Is user an admin? → YES: Allow
  └─ Otherwise → ForbiddenException
```

### Comment Creation

- No special authorization required
- Any authenticated user can comment on any post
- Timestamp and author tracked for auditing

### Comment Retrieval

- No authorization checks
- Comments visible to any user requesting them
- Authorization handled at controller/API layer

---

## Audit Logging

All comment operations create audit entries via DatabaseService.

### Audit Entry Format

```typescript
interface AuditEntry {
  id: string;              // Unique audit ID
  timestamp: string;       // ISO 8601 timestamp
  actor: string;          // User performing action
  action: string;         // COMMENT_ADDED | COMMENT_DELETED
  resource: string;       // 'comment'
  resourceId: string;     // Comment ID
}
```

### Actions Logged

| Action | Trigger |
|--------|---------|
| `COMMENT_ADDED` | Comment created via addComment() |
| `COMMENT_DELETED` | Comment deleted via deleteComment() |

### Database Failure Handling

- Audit insertion failures are silently caught
- Comment operations succeed even if audit fails
- Enables testing without database connection

---

## Sorting & Chronology

### Comments Sorting

- **Primary sort**: createdAt timestamp
- **Order**: Descending (newest first)
- **Use case**: Natural conversation flow (most recent at top)

### Implementation

```typescript
// Sort newest first
allComments.sort((a, b) => {
  const dateA = new Date(a.createdAt).getTime();
  const dateB = new Date(b.createdAt).getTime();
  return dateB - dateA; // Descending
});
```

---

## Pagination Algorithm

### Offset-Based Pagination

Used for predictable, stateless pagination.

```
totalItems = 42
pageSize = 10
page = 2

startIndex = (2 - 1) * 10 = 10
endIndex = 10 + 10 = 20
items = allItems[10:20] = items at index 10-19

totalPages = ceil(42 / 10) = 5
hasNextPage = 2 < 5 = true
hasPreviousPage = 2 > 1 = true
```

### Edge Cases

| Scenario | Result |
|----------|--------|
| Empty post | totalPages: 1, items: [], hasNext: false |
| Page beyond total | items: [], hasNext: false |
| Single item, pageSize: 100 | totalPages: 1, hasNext: false |
| Exactly fills pages | Correct pagination |

---

## Timestamps

All timestamps use ISO 8601 format (UTC).

### createdAt
- Set at comment creation
- Never updated
- Used for sorting

### updatedAt
- Set equal to createdAt at creation
- Could be updated for edit operations (future feature)
- Currently unused but reserved for compatibility

---

## Error Handling

### Exception Types

| Exception | Trigger | HTTP Status |
|-----------|---------|------------|
| `BadRequestException` | Invalid input, validation failure | 400 |
| `NotFoundException` | Comment/post not found | 404 |
| `ForbiddenException` | Insufficient permissions | 403 |

### Silent Failures

The following failures are silently caught:
- DatabaseService.insertAudit() failures (logging failures)
- This allows testing without real database connection

### Validation Errors

Validation errors are thrown immediately:
- Empty strings after trimming
- Missing required fields
- Text exceeds 5000 characters
- Invalid pagination parameters

---

## Testing Strategy

### Test Coverage Areas

1. **addComment**
   - Happy path with valid inputs
   - Input validation (all fields)
   - Whitespace trimming
   - Unique ID generation
   - Character limit enforcement (5000)
   - Audit entry creation
   - Database failure handling

2. **getComments**
   - Pagination (first, middle, last pages)
   - Sorting (newest first)
   - Filtering by postId
   - Empty post handling
   - All pagination fields (hasNext, hasPrev, totalPages)
   - Pagination validation (page >= 1, 1 <= pageSize <= 100)
   - Edge cases (pageSize: 1, pageSize: 100)

3. **deleteComment**
   - Author deletion (non-admin)
   - Admin deletion
   - Non-author, non-admin rejection
   - Comment not found handling
   - Audit entry creation
   - Storage cleanup
   - Database failure handling

4. **Authorization**
   - Author can delete own comment
   - Admin can delete any comment
   - Non-author/non-admin rejected
   - Case-sensitive user comparison

5. **Integration**
   - Multiple users commenting
   - Multiple posts
   - Add-delete-add cycles
   - Rapid comment creation

### Test Counts

- addComment: 14 tests
- getComments: 13 tests
- deleteComment: 9 tests
- Authorization: 4 tests
- Pagination edge cases: 5 tests
- Helper methods: 5 tests
- Integration: 5 tests
- **Total: 55+ tests**

---

## Usage Example

### Complete Workflow

```typescript
// Create comments
const comment1 = await commentService.addComment(
  'post-1',
  'alice',
  'Great article!'
);
const comment2 = await commentService.addComment(
  'post-1',
  'bob',
  'I agree with this perspective.'
);

// Retrieve first page
const page1 = await commentService.getComments('post-1', {
  page: 1,
  pageSize: 10
});

console.log(page1);
// {
//   items: [comment2, comment1],  // Newest first
//   totalCount: 2,
//   pageNumber: 1,
//   pageSize: 10,
//   totalPages: 1,
//   hasNextPage: false,
//   hasPreviousPage: false
// }

// Alice deletes her own comment
await commentService.deleteComment(comment1.id, 'alice', false);

// Retrieve again
const page1Updated = await commentService.getComments('post-1', {
  page: 1,
  pageSize: 10
});

console.log(page1Updated.totalCount); // 1
```

---

## Performance Considerations

### Time Complexity

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| addComment | O(1) | Direct Map insert |
| getComments | O(n log n) | Sort required |
| deleteComment | O(1) | Direct Map delete |
| getCommentById | O(1) | Direct Map lookup |
| getCommentCount | O(1) | Set size |

### Space Complexity

- **Comments Map**: O(n) where n = total comments
- **Comments by Post**: O(n) overhead tracking
- **Overall**: O(n) for n total comments across all posts

### Optimization Opportunities (Future)

- Pre-sort comments on insertion (trade-off: slower add)
- Cache pagination results (invalidate on add/delete)
- Lazy-load comment details
- Batch operations for bulk deletion

---

## Dependencies

```
CommentService
  └─ DatabaseService
      └─ insertAudit(AuditEntry): Promise<AuditEntry>
```

### Integration Points

- DatabaseService for audit logging
- NestJS exception classes (BadRequestException, etc.)
- Standard JavaScript Map/Set for in-memory storage

---

## Future Enhancements

1. **Edit Comments**: Update comment text with edit history
2. **Comment Replies**: Nested comments on comments
3. **Reactions**: Emoji reactions to comments
4. **Moderation**: Flag/hide inappropriate comments
5. **Permissions**: Comment approval workflows
6. **Notifications**: Comment-related user notifications

---

## Compliance & Audit

- All user actions logged to audit trail
- Deletion creates audit record with actor info
- Timestamps in ISO 8601 (UTC)
- No soft-deletes (hard removal)
- Complete audit trail for each comment lifecycle

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-07-13 | Initial implementation: addComment, getComments (paginated), deleteComment (auth) |

---

## Module Integration

```typescript
// engagement.module.ts
@Module({
  imports: [DatabaseModule],
  providers: [ReactionService, CommentService, ShareService],
  exports: [ReactionService, CommentService, ShareService],
})
export class EngagementModule {}
```

The CommentService is exported from EngagementModule and available for injection in controllers and other services.
