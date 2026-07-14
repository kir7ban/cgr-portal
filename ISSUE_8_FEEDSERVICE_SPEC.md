# Issue #8: FeedService Implementation Specification

**Issue**: Implement FeedService (Issue #8): getPublishedFeed with pagination, audience filtering, chronological sort
**Status**: IMPLEMENTATION COMPLETE
**Date**: 2026-07-13

---

## Overview

FeedService provides the core feed retrieval logic for the Bosch Internal Communications Platform. It implements:
- **Pagination**: Offset-based pagination with configurable page size (max 100)
- **Audience Filtering**: Role-based access control for posts (org-wide, dept-only, custom audiences)
- **Chronological Sorting**: Posts ordered newest-first by createdAt timestamp
- **State Filtering**: Published posts only (optionally includes user's own drafts)
- **Archive Handling**: Excludes archived posts by default

---

## Acceptance Criteria

### ✅ Pagination
- [x] `getPublishedFeed()` implements offset-based pagination
- [x] Accepts `page` and `pageSize` parameters
- [x] Returns `pageNumber`, `pageSize`, `totalCount`, `totalPages`
- [x] Calculates `hasNextPage` and `hasPreviousPage` flags
- [x] Validates page >= 1, pageSize >= 1 and <= 100
- [x] Returns correct page slice of results

### ✅ Audience Filtering
- [x] Posts with `org-wide` audience visible to all users
- [x] Posts with `dept-only` audience visible only to users in that department
- [x] Posts with custom audience (e.g., `custom:leadership-team`) visible only to users in that group
- [x] User audiences passed via `filters.audiences` array
- [x] Respects both `proposedAudience` and `approvedAudience` fields
- [x] Returns empty feed if user cannot access any posts

### ✅ Chronological Sorting
- [x] Posts sorted by `createdAt` timestamp
- [x] Newest posts first (descending order)
- [x] Pagination applied after sorting
- [x] Maintains sort order across pages

### ✅ State Filtering
- [x] Returns only PUBLISHED posts by default
- [x] Excludes DRAFT, SUBMITTED, REJECTED, REVOKED, ARCHIVED states
- [x] Optionally includes user's own DRAFT posts when `includeDrafts: true`
- [x] Does not show other users' draft posts even with `includeDrafts: true`

### ✅ Archive Handling
- [x] Excludes ARCHIVED posts by default when `excludeArchived: true`
- [x] Includes ARCHIVED posts when `excludeArchived: false`
- [x] Archived posts still searchable/retrievable separately

### ✅ Input Validation
- [x] Validates pagination params (page, pageSize types and bounds)
- [x] Throws `BadRequestException` for invalid pagination
- [x] Error messages are descriptive

### ✅ Feed Management
- [x] `addPublishedPost()` adds posts to feed (validates PUBLISHED state)
- [x] `removeFromFeed()` removes posts from feed (for revocation/deletion)
- [x] `getPublishedPost()` retrieves single post with access control
- [x] `updatePostAudience()` updates audience scope after re-approval
- [x] `archivePost()` soft-deletes posts (state = ARCHIVED)
- [x] `getFeedStats()` returns feed statistics

---

## API Reference

### `getPublishedFeed(userId, pagination, filters?)`

Main method to retrieve feed with filtering and pagination.

**Parameters:**
```typescript
userId: string;                          // User requesting the feed
pagination: {
  page: number;                          // Page number (1-based)
  pageSize: number;                      // Items per page (1-100)
};
filters?: {
  audiences?: string[];                  // User's audience memberships
  excludeArchived?: boolean;             // Exclude archived posts (default: true)
  includeDrafts?: boolean;               // Include own draft posts (default: false)
}
```

**Returns:**
```typescript
{
  items: PublishedPost[];                // Array of visible posts for this page
  totalCount: number;                    // Total matching posts
  pageNumber: number;                    // Current page (1-based)
  pageSize: number;                      // Items per page
  totalPages: number;                    // Total pages needed
  hasNextPage: boolean;                  // Has more pages after this
  hasPreviousPage: boolean;              // Has pages before this
}
```

**Example:**
```typescript
const feed = await feedService.getPublishedFeed(
  'user-123',
  { page: 1, pageSize: 20 },
  { 
    audiences: ['org-wide', 'dept:hr', 'custom:leadership-team'],
    excludeArchived: true,
    includeDrafts: false
  }
);

// Result:
{
  items: [...20 posts...],
  totalCount: 250,
  pageNumber: 1,
  pageSize: 20,
  totalPages: 13,
  hasNextPage: true,
  hasPreviousPage: false
}
```

---

### `addPublishedPost(post)`

Add a published post to the feed.

**Throws:** `BadRequestException` if post state is not PUBLISHED

---

### `removeFromFeed(postId)`

Remove a post from the feed (revocation or deletion).

**Returns:** The removed post or undefined if not found

---

### `getPublishedPost(postId, userId, userAudiences?)`

Get a single published post if user can view it.

**Returns:** Post if found and user has access, undefined otherwise

---

### `updatePostAudience(postId, newAudience, approvedBy)`

Update post audience after admin re-approval (edit-and-resubmit workflow).

**Sets:** `approvedAudience`, `approvedBy`, `approvedAt` timestamp

---

### `archivePost(postId)`

Soft-delete a post (changes state to ARCHIVED).

**Returns:** Updated post with state = ARCHIVED

---

### `getFeedStats()`

Get feed statistics (total published, archived, drafts).

**Returns:**
```typescript
{
  totalPublished: number;
  totalArchived: number;
  totalDrafts: number;
}
```

---

## Audience Visibility Rules

| Audience | Visibility |
|----------|-----------|
| `org-wide` | All employees |
| `dept-only` | Employees in that department |
| `dept:hr` | Employees in HR department |
| `custom:leadership-team` | Employees in custom group |
| (none/default) | Treated as `org-wide` |

---

## Sorting Strategy

Posts are sorted **chronologically (newest first)** by `createdAt` timestamp:
1. Fetch all posts matching state + audience filters
2. Sort descending by `createdAt` (JavaScript: `dateB - dateA`)
3. Apply pagination (slice based on page/pageSize)

This ensures consistent ordering across pages.

---

## Pagination Examples

**Total 25 posts, pageSize 10:**

| Page | Items | hasNext | hasPrev | totalPages |
|------|-------|---------|---------|-----------|
| 1    | 10    | true    | false   | 3         |
| 2    | 10    | true    | true    | 3         |
| 3    | 5     | false   | true    | 3         |

---

## Integration Points

### From PostCreationService
- Receives posts in SUBMITTED state
- Forwards to FeedService after admin approval (state → PUBLISHED)

### From ApprovalService
- Calls `addPublishedPost(post)` after approval
- Calls `updatePostAudience()` for scope changes
- Calls `removeFromFeed()` for revocations

### From PostEditService
- Calls `archivePost()` when posts exceed 1-year auto-archive threshold
- Calls `updatePostAudience()` when edit is re-approved with new scope

### To Frontend API
- GET /api/posts endpoint uses `getPublishedFeed()` + pagination params
- GET /api/posts/{id} endpoint uses `getPublishedPost()`

---

## Testing Coverage

### Unit Tests (40+ test cases)

#### Core Pagination
- ✅ Empty feed returns 0 items
- ✅ Page 1 returns first N items
- ✅ Page calculation correct (totalPages = ceil(totalCount/pageSize))
- ✅ hasNextPage/hasPreviousPage flags correct
- ✅ Page slicing correct (startIndex, endIndex)

#### Audience Filtering
- ✅ org-wide posts visible to all users
- ✅ dept-only posts visible only to department members
- ✅ custom audience posts visible only to group members
- ✅ Users with no audiences see only org-wide posts
- ✅ Multiple audience memberships work (user in HR and Finance)

#### Chronological Sorting
- ✅ Posts sorted newest-first by createdAt
- ✅ Sort order maintained across pages
- ✅ Same timestamp posts have consistent order

#### State Filtering
- ✅ PUBLISHED posts included
- ✅ DRAFT posts excluded by default
- ✅ ARCHIVED posts excluded by default
- ✅ includeDrafts=true includes own drafts
- ✅ includeDrafts=true does not include others' drafts
- ✅ excludeArchived=false includes archived posts

#### Input Validation
- ✅ page < 1 throws BadRequestException
- ✅ pageSize < 1 throws BadRequestException
- ✅ pageSize > 100 throws BadRequestException
- ✅ Null/undefined pagination throws BadRequestException

#### Feed Management
- ✅ addPublishedPost() adds to feed
- ✅ addPublishedPost() rejects non-PUBLISHED posts
- ✅ removeFromFeed() removes post
- ✅ removeFromFeed() returns undefined for non-existent posts
- ✅ getPublishedPost() respects audience filters
- ✅ updatePostAudience() sets approved fields
- ✅ archivePost() changes state to ARCHIVED
- ✅ archivePost() removes from feed (default excludeArchived)
- ✅ getFeedStats() returns correct counts

#### Complex Scenarios
- ✅ Multiple pages with mixed audiences
- ✅ Filtering + sorting + pagination combined
- ✅ Empty result sets handled correctly

**Test File**: `/apps/api/src/feed/feed.service.spec.ts`
**Test Count**: 40+ test cases
**Coverage Target**: 90%+ (service logic is critical path)

---

## Architecture

```
FeedService
├── getPublishedFeed()      // Main entry point: filter → sort → paginate
├── addPublishedPost()      // Feed management
├── removeFromFeed()        // Feed management
├── getPublishedPost()      // Single post with access control
├── updatePostAudience()    // Audience updates (re-approval)
├── archivePost()           // Soft-delete
├── getFeedStats()          // Analytics
└── Private Methods
    ├── userCanViewPost()   // Audience access control
    └── validatePaginationParams()  // Input validation
```

**Data Structure:**
```typescript
publishedPosts: Map<string, PublishedPost> = new Map();
// Key: post.id
// Value: Post with audience/approval metadata
```

---

## Performance Considerations

### Current Implementation
- In-memory Map for testing/MVP
- O(n) filtering, O(n log n) sorting per request
- Suitable for <10k posts (MVP scale)

### Production Optimization
- Use CosmosDB with indexed queries
  - Index on `state` (filter PUBLISHED)
  - Index on `createdAt` (sort)
  - Index on `approvedAudience` (filter audience)
  - Composite index: (state, createdAt DESC)
- Replace client-side sorting with database ORDER BY
- Use database pagination (OFFSET/LIMIT)
- Expected: <100ms for typical feeds (1000-2000 posts)

---

## Error Handling

### BadRequestException
- Invalid pagination params (page, pageSize)
- Adding non-PUBLISHED posts
- Posting/archiving non-existent posts

### Validation Rules
1. **Page**: Must be number >= 1
2. **PageSize**: Must be number >= 1 and <= 100
3. **Post State**: Only PUBLISHED can be added to feed
4. **Audiences**: Array of strings (department codes or custom group IDs)

---

## Dependencies

- `@nestjs/common`: BadRequestException
- `../database/database.service`: DatabaseService (future integration)

---

## Future Enhancements (Out of Scope MVP)

- [ ] Real-time feed updates (WebSocket)
- [ ] Personalized feed (engagement ranking)
- [ ] Search/full-text indexing
- [ ] Feed caching (Redis)
- [ ] Analytics events (view tracking)
- [ ] Feed recommendations (AI-based)

---

## Files Modified

### Created
- `/apps/api/src/feed/feed.service.ts` (330 lines)
  - Full FeedService implementation with docs

### Updated
- `/apps/api/src/feed/feed.service.spec.ts` (40+ tests)
  - Comprehensive test suite
  
- `/apps/api/src/feed/feed.module.ts`
  - Added DatabaseModule import for DI

---

## Verification Checklist

- [x] Service methods implemented
- [x] Pagination logic correct (offset-based, bounds validation)
- [x] Audience filtering working (org-wide, dept-only, custom)
- [x] Chronological sorting (newest first)
- [x] State filtering (PUBLISHED, optional DRAFT, exclude ARCHIVED)
- [x] Input validation with descriptive errors
- [x] Test suite 40+ test cases covering all scenarios
- [x] TypeScript interfaces documented
- [x] JSDoc comments on public methods
- [x] Module properly configured with DI
- [x] No console logs or debug code
- [x] Ready for integration with ApprovalService

---

## Usage Example (Integration with API Controller)

```typescript
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FeedService } from './feed.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/user.decorator';

@Controller('api/posts')
export class PostController {
  constructor(private feedService: FeedService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getFeed(
    @User() user: { id: string; audiences: string[] },
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ) {
    return await this.feedService.getPublishedFeed(
      user.id,
      { page: parseInt(String(page)), pageSize: parseInt(String(pageSize)) },
      {
        audiences: user.audiences,
        excludeArchived: true,
      }
    );
  }
}
```

---

## Summary

FeedService provides the foundation for feed retrieval with production-grade:
- ✅ Pagination (offset-based, validated bounds)
- ✅ Audience filtering (org-wide, department, custom groups)
- ✅ Chronological sorting (newest first)
- ✅ State filtering (published only, optional drafts)
- ✅ Archive handling (soft-delete)
- ✅ Comprehensive test coverage (40+ tests)

Ready for integration with:
- ApprovalService (publish posts)
- PostEditService (archive old posts)
- API controllers (GET /api/posts feed endpoint)
- Analytics dashboard (via getFeedStats)

**Status: READY FOR PRODUCTION INTEGRATION**
