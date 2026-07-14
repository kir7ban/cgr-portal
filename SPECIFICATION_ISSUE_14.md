# Issue #14: EditService Implementation Specification

**Status:** Complete  
**Date:** 2026-07-13  
**Service:** `EditService` (Advanced Module)  
**Location:** `/apps/api/src/advanced/edit.service.ts`  
**Tests:** `/apps/api/src/advanced/edit.service.spec.ts`

---

## Overview

EditService implements Issue #14 requirements for enabling Comms Officers to edit published posts with automatic re-approval workflow and comprehensive revision history tracking in the audit trail.

**Key Capability:** Comms Officers can edit published posts, which automatically triggers a new submission in the approval queue for Admin review. All edits are tracked with full revision history.

---

## Functional Requirements

### 1. Edit Published Posts

**Primary Method:** `editPublishedPost(postId, userId, updates)`

#### Preconditions
- Post must exist and be in `PUBLISHED` state
- Requesting user must be the post creator
- Updates must pass content validation

#### Workflow
1. Verify post exists and is PUBLISHED
2. Verify user is post creator (ForbiddenException if not)
3. Validate all proposed updates
4. Capture current post state for revision history
5. Apply updates to post document
6. Change post state from PUBLISHED → SUBMITTED
7. Create new submission in approval queue
8. Generate revision history entry
9. Log audit trail entries (edit + revision)
10. Return post, submission, and revision details

#### Return Value
```typescript
{
  post: PostDocument (updated)
  submission: Submission (new, PENDING state)
  revision: RevisionHistory (new entry)
}
```

#### Example Usage
```typescript
const result = await editService.editPublishedPost(
  'post-123',
  'alice.smith',
  {
    title: 'Updated Title',
    content: 'Updated content with corrections',
    changesSummary: 'Fixed typos and improved clarity'
  }
);

// result.post.state === 'SUBMITTED'
// result.submission.state === 'PENDING'
// result.revision.revisionNumber === 1
```

---

### 2. Revision History Tracking

**Data Structure:** `RevisionHistory`

```typescript
interface RevisionHistory {
  id: string;                              // Unique revision ID
  postId: string;                          // Parent post ID
  revisionNumber: number;                  // Sequential: 1, 2, 3...
  editedBy: string;                        // User who made edit
  editedAt: string;                        // ISO timestamp
  previousContent: string;                 // Content before edit
  previousTitle: string;                   // Title before edit
  newTitle: string;                        // Title after edit
  newContent: string;                      // Content after edit
  changesSummary: string;                  // Human-readable change description
  submissionId?: string;                   // Linked submission for re-approval
}
```

#### Automatic Change Summary Generation
If `changesSummary` is not provided, service auto-generates from diffs:

```
// Examples:
'Title updated'
'Content revised'
'Images updated'
'Title updated, content revised, images updated'
'Video updated'
'Documents updated'
```

#### Methods

**getRevisionHistory(postId): Promise<RevisionHistory[]>**
- Returns all revisions for a post in chronological order
- Throws `BadRequestException` if post not found
- Returns empty array if no revisions exist

**getRevision(revisionId): Promise<RevisionHistory | undefined>**
- Retrieves specific revision by ID
- Returns `undefined` if not found

**getRevisionCount(postId): Promise<number>**
- Returns the count of revisions for a post
- Returns 0 if no revisions

---

### 3. Audit Trail Integration

Every edit operation logs TWO audit entries:

#### Entry 1: Edit Action
```typescript
{
  id: 'audit-edit-{postId}-{timestamp}',
  timestamp: ISO8601,
  actor: userId,
  action: 'edit_published_post',
  resource: 'post',
  resourceId: postId
}
```

#### Entry 2: Revision Creation
```typescript
{
  id: 'audit-revision-{revisionId}',
  timestamp: revisionEditedAt,
  actor: userId,
  action: 'create_revision',
  resource: 'revision',
  resourceId: revisionId
}
```

**Note:** Audit entries are immutable (append-only). See DatabaseService for audit API.

---

## Content Validation

All edits are validated before state changes using strict rules:

### Title Validation
- ✗ Empty or whitespace-only
- ✓ Any non-empty string

### Content Validation
- ✗ Empty or whitespace-only
- ✓ Any non-empty string

### Image Validation
- ✗ More than 3 images per post
- ✗ Types other than: jpeg, png, gif, webp
- ✗ Size > 5MB per image
- ✓ 0-3 images with valid types and sizes

### Video Validation
- ✗ Direct uploads (source: 'direct')
- ✗ Sources other than 'youtube' or 'internal'
- ✓ Linked videos only (youtube or internal source)

### Document Validation
- ✗ Types outside: pdf, docx, xlsx, xls, doc
- ✗ Size > 10MB per document
- ✓ Standard office documents within size limits

### Validation Errors
All validation failures throw `BadRequestException` with descriptive messages:

```
'Content cannot be empty'
'Title cannot be empty'
'Maximum 3 images allowed per post'
'Invalid image type'
'Image size cannot exceed 5MB'
'Direct video uploads not allowed'
'Video source must be youtube or internal'
'Unsupported document type'
'Document size cannot exceed 10MB'
```

---

## State Transitions

### Post State Changes

```
PUBLISHED
   ↓ (editPublishedPost)
SUBMITTED ← (awaiting re-approval)
   ↓ (admin approves)
PUBLISHED
   ↓ (or admin sends feedback)
DRAFT ← (for Comms Officer to revise)
   ↓ (Comms Officer edits and submits)
SUBMITTED
```

### Submission Workflow

When editing a published post:

1. **Existing submission history preserved** - All previous submissions for the post remain in history
2. **New submission created** - Identical to initial submission workflow
3. **State: PENDING** - New submission enters approval queue as PENDING
4. **Proposed audience preserved** - Uses original proposedAudience unless overridden
5. **Awaits re-approval** - Admin reviews and takes same actions: approve, reject, or feedback

---

## Access Control

### Role-Based Permissions

| Action | Role | Allowed | Notes |
|--------|------|---------|-------|
| Edit published post | Comms Officer | ✓ | Only own posts |
| Edit published post | Admin | ✗ | Admins don't create/edit content |
| Edit published post | Employee | ✗ | Read-only role |

### Authorization Checks

```typescript
// Check 1: Post existence and accessibility
const post = await postService.getPostForUser(postId, userId);
if (!post) throw BadRequestException('Post not found or you do not have access');

// Check 2: Post creator verification
if (post.createdBy !== userId) throw ForbiddenException('Only post creator can edit');

// Check 3: Post state verification
if (post.state !== 'PUBLISHED') throw BadRequestException('Only published posts can be edited');
```

---

## Error Handling

### Exception Types

| Exception | Scenario | HTTP Status |
|-----------|----------|-------------|
| `BadRequestException` | Post not found, wrong state, validation failure | 400 |
| `ForbiddenException` | User is not post creator | 403 |

### Common Error Messages

```
'Post not found or you do not have access'
  → Post doesn't exist or user lacks visibility

'Only post creator can edit'
  → User is not the post author

'Only published posts can be edited. Draft posts use PATCH /api/posts/{id}'
  → Attempting to edit draft instead of published post

'Content cannot be empty'
  → Validation error: empty or whitespace content

'Maximum 3 images allowed per post'
  → Validation error: too many images
```

---

## Integration Points

### PostService Integration
- `getPostForUser(postId, userId)` - Retrieve post with access control
- `updatePostState(postId, newState)` - Change post state to SUBMITTED

### ApprovalService Integration
- `createSubmission(postId, userId, proposedAudience)` - Create new submission for re-approval
- `getSubmissionsForPost(postId)` - Retrieve submission history

### DatabaseService Integration
- `insertAudit(entry)` - Log edit and revision events

---

## Database Schema Considerations

### Collections Used
- `posts` - Updated post document
- `submissions` - New submission entry created
- `audit` - Two entries per edit (edit + revision)
- `revisions` - Could be added for dedicated revision storage (optional)

### Indexes Recommended
For efficient revision tracking:
```
/postId
/editedAt
/revisionNumber
/editedBy (for per-user edit history)
```

---

## API Integration (Controller Level)

### Endpoint Example
```
PATCH /api/posts/{postId}/edit
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Updated Title",
  "content": "Updated content",
  "images": [...],
  "changesSummary": "Fixed errors and improved clarity"
}
```

### Success Response (200 OK)
```json
{
  "post": {
    "id": "post-123",
    "title": "Updated Title",
    "content": "Updated content",
    "state": "SUBMITTED",
    "createdBy": "alice.smith",
    "createdAt": "2026-07-13T10:00:00Z"
  },
  "submission": {
    "id": "submission-post-123-1689254400000",
    "postId": "post-123",
    "createdBy": "alice.smith",
    "submittedAt": "2026-07-13T10:30:00Z",
    "state": "PENDING",
    "proposedAudience": "org-wide"
  },
  "revision": {
    "id": "revision-post-123-1689254400000",
    "postId": "post-123",
    "revisionNumber": 1,
    "editedBy": "alice.smith",
    "editedAt": "2026-07-13T10:30:00Z",
    "previousTitle": "Original Title",
    "previousContent": "Original content",
    "newTitle": "Updated Title",
    "newContent": "Updated content",
    "changesSummary": "Title updated, content revised",
    "submissionId": "submission-post-123-1689254400000"
  }
}
```

### Error Response (400/403)
```json
{
  "statusCode": 400,
  "message": "Only published posts can be edited. Draft posts use PATCH /api/posts/{id}",
  "error": "Bad Request"
}
```

---

## Testing Strategy

### Test Coverage (45+ tests)

#### Core Functionality Tests
- ✓ Edit published post and change state to SUBMITTED
- ✓ Create new submission for re-approval
- ✓ Preserve proposed audience from original submission
- ✓ Create revision history entry with tracking
- ✓ Generate automatic change summary
- ✓ Accept custom change summary
- ✓ Update media (images, video, documents)
- ✓ Log audit entries for edit and revision

#### Authorization & Validation Tests
- ✓ Prevent non-creator from editing
- ✓ Prevent editing non-existent post
- ✓ Prevent editing draft posts
- ✓ Prevent editing rejected posts
- ✓ Validate empty/whitespace content
- ✓ Validate empty/whitespace title
- ✓ Validate image types, sizes, counts
- ✓ Validate video sources
- ✓ Validate document types and sizes

#### Workflow Tests
- ✓ publish → edit → re-approve → re-edit → re-approve
- ✓ publish → edit → feedback → edit again → approve
- ✓ Maintain full audit trail across edits
- ✓ Allow admin re-approval with audience override
- ✓ Prevent edits from unauthorized users
- ✓ Preserve timestamps in revision history
- ✓ Link submission to revision

#### Edge Cases
- ✓ Handle rapid successive edits with proper sequencing
- ✓ Handle whitespace-only content rejection
- ✓ Allow partial updates (title only)
- ✓ Allow partial updates (content only)
- ✓ Track media changes in revision history

---

## Usage Examples

### Example 1: Simple Content Update
```typescript
const result = await editService.editPublishedPost(
  'post-456',
  'alice.smith',
  {
    content: 'Fixed typos and updated statistics'
  }
);

// result.revision.changesSummary === 'Content revised'
// result.submission ready for admin review
```

### Example 2: Multiple Media Changes
```typescript
const result = await editService.editPublishedPost(
  'post-789',
  'alice.smith',
  {
    title: 'Q3 Results: Updated Projections',
    content: 'Updated quarterly results with latest data',
    images: [newImageData],
    changesSummary: 'Updated title and content with Q3 final numbers'
  }
);

// result.revision.revisionNumber === 3
// Both title and content updated
```

### Example 3: Retrieve Revision History
```typescript
const history = await editService.getRevisionHistory('post-123');

history.forEach(revision => {
  console.log(`v${revision.revisionNumber}: ${revision.changesSummary}`);
  console.log(`  By: ${revision.editedBy} at ${revision.editedAt}`);
});

// Output:
// v1: Title updated
//   By: alice.smith at 2026-07-13T10:30:00Z
// v2: Content revised, images updated
//   By: alice.smith at 2026-07-13T11:00:00Z
```

### Example 4: Workflow with Feedback Loop
```typescript
// Admin sends feedback on first edit
await approvalService.sendFeedback(submission1.id, 'admin', {
  message: 'Please add more context'
});

// Comms officer edits again based on feedback
const result = await editService.editPublishedPost(
  'post-123',
  'alice.smith',
  {
    content: 'Content with more context as requested',
    changesSummary: 'Added context per admin feedback'
  }
);

// result.submission ready for re-approval
```

---

## Performance Considerations

### Time Complexity
- `editPublishedPost()`: O(1) for in-memory operations
- `getRevisionHistory()`: O(r) where r = number of revisions
- `getRevision()`: O(r) linear search through revisions
- `getRevisionCount()`: O(1) map lookup

### Space Complexity
- Per-post revision history: O(r * e) where r = revisions, e = edit size
- Audit entries: 2 per edit (fixed size)

### Optimization Notes
For production with large revision histories:
1. Implement pagination in `getRevisionHistory()`
2. Consider dedicated revisions collection with indexing
3. Archive old revisions after 1 year (per requirements)
4. Implement lazy-loading for media diffs

---

## Audit Compliance

### Immutable Record Keeping
- All edits logged in append-only audit trail
- Cannot modify or delete audit entries
- Revision history preserved indefinitely
- Change diffs available for compliance review

### Tracked Information
- Who edited (editedBy)
- When edited (editedAt, ISO timestamp)
- What changed (previousContent/newContent, changesSummary)
- Which submission triggered re-approval (submissionId)
- Complete audit trail in DatabaseService

### Data Retention
Per requirements: 3-year retention for all audit logs
- Revision entries stored indefinitely in revision history
- Audit entries retained for 3 years (compliance)
- Posts archived after 1 year (soft delete)

---

## Future Enhancements (Out of MVP Scope)

1. **Revision Comparison UI** - Side-by-side diff view of changes
2. **Revision Rollback** - Admin ability to revert to previous version
3. **Change Notifications** - Alert admins when posts are edited
4. **Batch Edits** - Multiple posts edited simultaneously
5. **Edit Comments** - Admin comments on specific revisions
6. **Approval Shortcuts** - Admin can approve known-good edits faster
7. **Edit Webhooks** - External system notifications on edits

---

## Summary

EditService provides comprehensive edit capabilities for published posts with:

✓ Full re-approval workflow (edits treated as new submissions)  
✓ Complete revision history tracking (sequential numbering, full diffs)  
✓ Immutable audit trail (two entries per edit for compliance)  
✓ Strict content validation (all media types and sizes)  
✓ Access control (only post creators can edit their own)  
✓ State management (PUBLISHED → SUBMITTED → PUBLISHED workflow)  
✓ Audience preservation (proposed audience carried forward)  
✓ Error handling (descriptive messages for all failure modes)  

---

## Test Execution

Run tests:
```bash
npm test -- edit.service.spec.ts
```

Expected: 45+ tests passing, 100% coverage of EditService

---

## Files Modified/Created

| File | Status | Purpose |
|------|--------|---------|
| `/apps/api/src/advanced/edit.service.ts` | Updated | Complete EditService implementation |
| `/apps/api/src/advanced/edit.service.spec.ts` | Created | Comprehensive test suite (45+ tests) |
| `/SPECIFICATION_ISSUE_14.md` | Created | This specification document |

---

## Implementation Checklist

- [x] Service class created with all methods
- [x] RevisionHistory interface defined
- [x] EditPublishedPostDto interface defined
- [x] editPublishedPost() method implemented
- [x] getRevisionHistory() method implemented
- [x] getRevision() method implemented
- [x] getRevisionCount() method implemented
- [x] Content validation (all media types)
- [x] Access control enforcement
- [x] Audit trail logging (2 entries per edit)
- [x] Revision history tracking (sequential numbering)
- [x] State transition management (PUBLISHED → SUBMITTED)
- [x] Integration with ApprovalService
- [x] Integration with DatabaseService
- [x] Error handling with descriptive messages
- [x] Test suite with 45+ tests
- [x] All edge cases covered

---

**Status:** ✓ Complete and Ready for Integration

Issue #14 implementation provides a production-ready EditService with full re-approval workflow, comprehensive revision tracking, and complete audit compliance.
