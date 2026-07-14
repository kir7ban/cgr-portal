# Issue #15: RevocationService Quick Reference

**For developers integrating RevocationService into controllers and components.**

---

## Service Injection

```typescript
import { RevocationService } from '../advanced/revoke.service';

@Controller('api/posts')
export class PostController {
  constructor(private revocationService: RevocationService) {}
}
```

---

## Core Method: revokePost()

### Basic Usage (No Reason)

```typescript
const result = await this.revocationService.revokePost(
  'post-123',
  'bob.admin'
);

// Result:
// {
//   postId: 'post-123',
//   revokedBy: 'bob.admin',
//   revokedAt: '2024-07-13T10:30:45.123Z',
//   reason: undefined,
//   message: 'Post successfully revoked and removed from feed'
// }
```

### With Reason

```typescript
const result = await this.revocationService.revokePost(
  'post-123',
  'bob.admin',
  { reason: 'Violates company policy' }
);

// Result:
// {
//   postId: 'post-123',
//   revokedBy: 'bob.admin',
//   revokedAt: '2024-07-13T10:30:45.123Z',
//   reason: 'Violates company policy',
//   message: 'Post successfully revoked and removed from feed'
// }
```

### In Controller Endpoint

```typescript
@Post('/posts/:id/revoke')
@UseGuards(AuthGuard())
async revokePost(
  @Param('id') postId: string,
  @Body() dto: RevokePostDto,
  @CurrentUser() userId: string
) {
  try {
    const result = await this.revocationService.revokePost(postId, userId, dto);
    return { status: 'success', data: result };
  } catch (error) {
    if (error instanceof ForbiddenException) {
      return res.status(403).json({ message: 'Only admins can revoke posts' });
    }
    if (error instanceof NotFoundException) {
      return res.status(404).json({ message: 'Post not found' });
    }
    if (error instanceof BadRequestException) {
      return res.status(400).json({ message: error.message });
    }
    throw error;
  }
}
```

---

## Discovery Methods

### Get Single Revocation

```typescript
const record = await this.revocationService.getRevocation('revoke-post-123-1689123456789-abc123');

if (record) {
  console.log(`Revoked by: ${record.revokedBy}`);
  console.log(`Reason: ${record.reason || 'Not provided'}`);
}
```

### Get Post Revocation History

```typescript
const revocations = await this.revocationService.getRevocationsForPost('post-123');

console.log(`Post has been revoked ${revocations.length} times`);
for (const r of revocations) {
  console.log(`- ${r.revokedAt}: ${r.revokedBy}`);
}
```

### Get Admin Activity

```typescript
const admins = ['bob.admin', 'alice.admin', 'carol.admin'];

for (const admin of admins) {
  const revocations = await this.revocationService.getRevocationsByAdmin(admin);
  console.log(`${admin}: ${revocations.length} posts revoked`);
}
```

### Get Only Documented Revocations

```typescript
const documented = await this.revocationService.getDocumentedRevocations();

console.log(`${documented.length} revocations have documented reasons`);
```

---

## Analytics Methods

### Total Count

```typescript
const count = await this.revocationService.getRevokedPostCount();
console.log(`Total posts revoked: ${count}`);
```

### Recent Activity (For Audit Dashboard)

```typescript
// Get last 10 revocations
const recent = await this.revocationService.getRecentRevocations(10);

for (const r of recent) {
  console.log(`${r.revokedAt} - Post ${r.postId} revoked by ${r.revokedBy}`);
}
```

### Stats For Dashboard

```typescript
const stats = await this.revocationService.getRevocationStats();

return {
  totalRevoked: stats.totalRevocations,
  recentDays7: stats.recentRevocations,
  documented: `${(stats.withReason / stats.totalRevocations * 100).toFixed(1)}%`,
  avgReasonLength: Math.round(stats.avgReasonsLength),
};
```

---

## Utility Methods

### Check If Post Is Revoked (For Feed Filtering)

```typescript
// In FeedService
async getFeed(userId: string) {
  const posts = await this.postService.getPublished();

  // Filter out revoked posts
  return Promise.all(
    posts.map(async (post) => {
      const isRevoked = await this.revocationService.isPostRevoked(post.id);
      return isRevoked ? null : post;
    })
  ).then(results => results.filter(Boolean));
}
```

---

## Error Handling Patterns

### Pattern 1: Admin-Only Guard

```typescript
try {
  await this.revocationService.revokePost('post-123', userId);
} catch (error) {
  if (error instanceof ForbiddenException) {
    // User is not admin, redirect to access denied
    return res.status(403).json({ message: 'Access denied' });
  }
  throw error;
}
```

### Pattern 2: Post Not Found

```typescript
try {
  await this.revocationService.revokePost('nonexistent-id', 'bob.admin');
} catch (error) {
  if (error instanceof NotFoundException) {
    // Post doesn't exist, return 404
    return res.status(404).json({ message: 'Post not found' });
  }
  throw error;
}
```

### Pattern 3: Invalid State

```typescript
try {
  await this.revocationService.revokePost('draft-post-id', 'bob.admin');
} catch (error) {
  if (error instanceof BadRequestException) {
    // Post is not in PUBLISHED state
    return res.status(400).json({ message: error.message });
  }
  throw error;
}
```

### Pattern 4: Reason Too Long

```typescript
try {
  const longReason = 'a'.repeat(501);
  await this.revocationService.revokePost('post-123', 'bob.admin', {
    reason: longReason
  });
} catch (error) {
  if (error instanceof BadRequestException) {
    return res.status(400).json({ message: 'Reason too long (max 500 chars)' });
  }
  throw error;
}
```

---

## Type Definitions

### Request DTO

```typescript
interface RevokePostDto {
  reason?: string;  // Optional, max 500 chars
}
```

### Response DTO

```typescript
interface RevokePostResponse {
  postId: string;
  revokedBy: string;
  revokedAt: string;        // ISO 8601
  reason?: string;
  message: string;
}
```

### Revocation Record

```typescript
interface RevocationRecord {
  id: string;               // revoke-{postId}-{timestamp}-{random}
  postId: string;
  revokedBy: string;
  revokedAt: string;        // ISO 8601
  reason?: string;
  previousState: string;    // Always 'PUBLISHED'
}
```

### Stats Object

```typescript
interface RevocationStats {
  totalRevocations: number;
  recentRevocations: number;  // Last 7 days
  withReason: number;         // Count with reason
  avgReasonsLength: number;   // Average chars
}
```

---

## Integration Examples

### Example 1: Admin Dashboard Widget

```typescript
@Get('/admin/revocations/summary')
async getRevocationSummary() {
  const stats = await this.revocationService.getRevocationStats();
  const recent = await this.revocationService.getRecentRevocations(5);

  return {
    summary: {
      total: stats.totalRevocations,
      last7Days: stats.recentRevocations,
      documentedPercent: (stats.withReason / stats.totalRevocations * 100).toFixed(1),
    },
    recentActivity: recent.map(r => ({
      postId: r.postId,
      revokedBy: r.revokedBy,
      reason: r.reason || 'No reason',
      date: new Date(r.revokedAt).toLocaleDateString(),
    })),
  };
}
```

### Example 2: Feed Service

```typescript
@Injectable()
export class FeedService {
  constructor(
    private postService: PostService,
    private revocationService: RevocationService
  ) {}

  async getFeedForUser(userId: string) {
    // Get all published posts for user's audience
    const posts = await this.postService.getPublished();

    // Filter out revoked posts
    const feedPosts = await Promise.all(
      posts.map(async (post) => {
        const isRevoked = await this.revocationService.isPostRevoked(post.id);
        return isRevoked ? null : post;
      })
    );

    return feedPosts.filter(p => p !== null);
  }
}
```

### Example 3: Audit Dashboard

```typescript
@Get('/admin/audit/revocations')
async getRevocationAudit(@Query('limit') limit: number = 50) {
  const revocations = await this.revocationService.getRecentRevocations(limit);

  return {
    count: revocations.length,
    entries: revocations.map(r => ({
      id: r.id,
      postId: r.postId,
      admin: r.revokedBy,
      reason: r.reason,
      timestamp: r.revokedAt,
      documented: !!r.reason,
    })),
  };
}
```

### Example 4: Compliance Report

```typescript
@Get('/admin/compliance/revocations')
async getRevocationCompliance() {
  const total = await this.revocationService.getRevokedPostCount();
  const documented = await this.revocationService.getDocumentedRevocations();

  const allRevocations = await this.revocationService.getRecentRevocations(1000);
  const byAdmin = {};

  for (const r of allRevocations) {
    if (!byAdmin[r.revokedBy]) {
      byAdmin[r.revokedBy] = { total: 0, documented: 0 };
    }
    byAdmin[r.revokedBy].total++;
    if (r.reason) byAdmin[r.revokedBy].documented++;
  }

  return {
    overallDocumentation: `${(documented.length / total * 100).toFixed(1)}%`,
    byAdmin: Object.entries(byAdmin).map(([admin, stats]) => ({
      admin,
      total: stats.total,
      documented: stats.documented,
      documentationRate: `${(stats.documented / stats.total * 100).toFixed(1)}%`,
    })),
  };
}
```

---

## Common Patterns

### Pattern: List All Undocumented Revocations

```typescript
const allRevocations = await this.revocationService.getRecentRevocations(1000);
const undocumented = allRevocations.filter(r => !r.reason);

console.log(`${undocumented.length} undocumented revocations found`);
for (const r of undocumented) {
  console.log(`- ${r.postId}: revoked by ${r.revokedBy} on ${r.revokedAt}`);
}
```

### Pattern: Find Most Active Admin

```typescript
const admins = ['bob.admin', 'alice.admin', 'carol.admin'];
let mostActive = { admin: '', count: 0 };

for (const admin of admins) {
  const count = (await this.revocationService.getRevocationsByAdmin(admin)).length;
  if (count > mostActive.count) {
    mostActive = { admin, count };
  }
}

console.log(`Most active: ${mostActive.admin} (${mostActive.count} revocations)`);
```

### Pattern: Quality Metrics

```typescript
const stats = await this.revocationService.getRevocationStats();

const metrics = {
  totalRevocations: stats.totalRevocations,
  documentedRevocations: stats.withReason,
  documentationRate: `${(stats.withReason / stats.totalRevocations * 100).toFixed(1)}%`,
  averageReasonLength: Math.round(stats.avgReasonsLength),
  averageReasonDetail: stats.avgReasonsLength < 20 ? 'Low' : 
                       stats.avgReasonsLength < 100 ? 'Medium' : 'High',
};

console.log(`Documentation Quality: ${metrics.averageReasonDetail}`);
```

---

## Audit Trail Details

### What Gets Logged

**For every revocation:**
1. Primary audit entry with action 'revoke_post'
2. Secondary audit entry if reason provided (action 'revoke_post_with_reason')

### Audit Fields

```typescript
{
  id: 'audit-revoke-post-123-1689123456789',      // Unique ID
  timestamp: '2024-07-13T10:30:45.123Z',           // ISO 8601
  actor: 'bob.admin',                              // Who revoked
  action: 'revoke_post',                           // What action
  resource: 'post',                                // Resource type
  resourceId: 'post-123'                           // Which resource
}
```

### Why Two Entries?

- **Primary:** Documents the revocation action
- **Secondary:** Documents that reason was provided (for compliance tracking)

---

## Testing Examples

### Unit Test: Authorization

```typescript
it('should reject non-admin users', async () => {
  await expect(
    service.revokePost('post-123', 'employee-user')
  ).rejects.toThrow(ForbiddenException);
});
```

### Unit Test: State Validation

```typescript
it('should reject non-published posts', async () => {
  await expect(
    service.revokePost('draft-post-id', 'bob.admin')
  ).rejects.toThrow(BadRequestException);
});
```

### Unit Test: Success Case

```typescript
it('should revoke published post', async () => {
  const result = await service.revokePost('post-123', 'bob.admin', {
    reason: 'Test reason'
  });

  expect(result.postId).toBe('post-123');
  expect(result.revokedBy).toBe('bob.admin');
  expect(result.reason).toBe('Test reason');
});
```

### Integration Test: Feed Filtering

```typescript
it('should exclude revoked posts from feed', async () => {
  // Publish a post
  const post = await createPublishedPost('post-123');

  // Verify it's in feed
  let feed = await feedService.getFeed();
  expect(feed).toContainEqual(expect.objectContaining({ id: 'post-123' }));

  // Revoke it
  await revocationService.revokePost('post-123', 'bob.admin');

  // Verify it's not in feed
  feed = await feedService.getFeed();
  expect(feed).not.toContainEqual(expect.objectContaining({ id: 'post-123' }));
});
```

---

## Troubleshooting

### Error: "Only Admins can revoke posts"

**Cause:** User ID is not in admin list  
**Solution:** Add user to ADMIN_USERS array or use actual admin user

```typescript
// MVP fix: Add to hardcoded list
private readonly ADMIN_USERS = ['bob.admin', 'new.admin'];

// Production fix: Use Azure Entra roles
private isAdmin(userId: string): boolean {
  return this.authContext.hasRole(userId, 'Admin');
}
```

### Error: "Post not found"

**Cause:** Post ID doesn't exist or not accessible  
**Solution:** Verify post exists and is published

```typescript
// Check post state before revoking
const post = await this.postService.getPostForUser(postId, adminId);
console.log(`Post state: ${post?.state}`);
```

### Error: "Cannot revoke post in DRAFT state"

**Cause:** Post is not in PUBLISHED state  
**Solution:** Only published posts can be revoked

```typescript
// Valid states for revocation:
// - PUBLISHED ✓

// Invalid states:
// - DRAFT, SUBMITTED, REJECTED, REVOKED, ARCHIVED ✗
```

### Error: "Reason exceeds 500 characters"

**Cause:** Reason field is too long  
**Solution:** Limit reason to 500 characters

```typescript
const reason = someReason.substring(0, 500);
await revocationService.revokePost(postId, adminId, { reason });
```

---

## Performance Notes

- `revokePost()`: O(1) - Instant
- `getRevocation()`: O(1) - Instant
- `getRevocationsForPost()`: O(1) - Index lookup
- `getRevokedPostCount()`: O(1) - Instant
- `getRecentRevocations()`: O(n log n) - Requires sort
- `getRevocationStats()`: O(n) - Single pass

For large data sets (>10k revocations), consider:
- Paginating `getRecentRevocations()`
- Caching `getRevocationStats()`
- Moving to CosmosDB with indexes

---

## Related Services

- **PostService:** For post retrieval and state updates
- **DatabaseService:** For audit trail persistence
- **FeedService:** For filtering revoked posts
- **AnalyticsService:** For dashboard metrics
- **AuditTrailService:** For compliance reporting

---

**End of Quick Reference**

For full details, see:
- `ISSUE_15_REVOCATIONSERVICE_SPEC.md` — Complete specification
- `ISSUE_15_IMPLEMENTATION_SUMMARY.md` — High-level overview
- `apps/api/src/advanced/revoke.service.ts` — Implementation code
