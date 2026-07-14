# ShareService Quick Reference

**Location:** `apps/api/src/engagement/share.service.ts`

---

## Service Injection

```typescript
import { ShareService } from './engagement/share.service';

constructor(private shareService: ShareService) {}
```

---

## Core Method: Share Post

### Basic Usage
```typescript
const share = await this.shareService.sharePost(
  'post-123',           // postId
  'user-456',           // userId (sharer)
  ['user-789']          // recipientIds
);

// Returns:
// {
//   id: 'share-550e8400-e29b-41d4-a716-446655440000',
//   postId: 'post-123',
//   sharedBy: 'user-456',
//   sharedWith: ['user-789'],
//   sharedAt: '2026-07-13T10:30:45.123Z',
//   recipientCount: 1
// }
```

### Multiple Recipients
```typescript
const share = await this.shareService.sharePost(
  'post-123',
  'user-456',
  ['user-789', 'user-101', 'user-202']  // Up to 100
);
```

### In Controller
```typescript
@Post('/posts/:id/share')
@UseGuards(AuthGuard())
async sharePost(
  @Param('id') postId: string,
  @Body() dto: { recipientIds: string[] },
  @CurrentUser() userId: string
) {
  return this.shareService.sharePost(postId, userId, dto.recipientIds);
}
```

---

## Discovery Methods

### Get Single Share
```typescript
const share = await this.shareService.getShare('share-xyz');
// Throws NotFoundException if not found
```

### Get All Shares for a Post
```typescript
const shares = await this.shareService.getSharesForPost('post-123');
// Returns: Share[]
```

### Get Shares by User
```typescript
const shares = await this.shareService.getSharesByUser('user-456');
// Returns: Share[] (all shares created by user)
```

### Get Recent Shares (Audit Dashboard)
```typescript
const recent = await this.shareService.getRecentShares(50);
// Returns: Share[] sorted by timestamp DESC
```

---

## Analytics Methods

### Share Count
```typescript
const count = await this.shareService.getShareCount('post-123');
// Returns: 5 (post shared 5 times)
```

### Share Reach (Unique Recipients)
```typescript
const reach = await this.shareService.getShareReach('post-123');
// Returns: 12 (12 unique people received via sharing)
```

### Comprehensive Statistics
```typescript
const stats = await this.shareService.getShareStats('post-123');
// Returns: {
//   totalShares: 5,
//   uniqueRecipients: 12,
//   sharingUsers: 4,
//   lastSharedAt: '2026-07-13T14:25:30.456Z'
// }
```

---

## Error Handling

### Bad Request (400)
```typescript
try {
  await this.shareService.sharePost('', 'user-1', []);
} catch (e) {
  // BadRequestException: 'Post ID, User ID, and at least one recipient are required'
}
```

### Not Found (404)
```typescript
try {
  await this.shareService.sharePost('invalid-post', 'user-1', ['user-2']);
} catch (e) {
  // NotFoundException: 'Post invalid-post not found'
}
```

### Forbidden (403)
```typescript
try {
  await this.shareService.sharePost('post-1', 'user-1', ['user-1']);
} catch (e) {
  // ForbiddenException: 'Cannot share a post with yourself'
}
```

---

## Validation Rules

| Check | Rule |
|-------|------|
| Post exists | ✓ Required |
| Post state | Must be PUBLISHED or ARCHIVED |
| Recipients | 1-100 items |
| Recipient IDs | Non-empty strings |
| Self-share | Prevented (ForbiddenException) |
| Duplicates | Auto-deduplicated |

---

## Audit Trail

Every share creates immutable entry:

```typescript
{
  id: 'audit-share-<share-id>',
  timestamp: '<ISO 8601>',
  actor: '<user-id>',
  action: 'share_post',
  resource: 'post',
  resourceId: '<post-id>'
}
```

Query in audit trail:
```typescript
// All shares by user-456
GET /api/audit?action=share_post&actor=user-456

// All shares of post-123
GET /api/audit?action=share_post&resourceId=post-123
```

---

## For Analytics Dashboard

```typescript
async getPostMetrics(postId: string) {
  const stats = await this.shareService.getShareStats(postId);
  
  return {
    shares: stats.totalShares,           // How many times shared
    shareReach: stats.uniqueRecipients,  // How many unique people
    shareUsers: stats.sharingUsers,      // How many different sharers
    lastShared: stats.lastSharedAt,      // Timestamp
  };
}
```

---

## For Audit Dashboard

```typescript
async getRecentActivity(days: number = 7) {
  const all = await this.shareService.getRecentShares(1000);
  
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  return all.filter(s => new Date(s.sharedAt) >= cutoff);
}
```

---

## Common Patterns

### Check if Post is Shareable
```typescript
const post = await this.databaseService.getPost(postId);
const shareable = post && 
  (post.state === 'PUBLISHED' || post.state === 'ARCHIVED');
```

### Get Sharing Activity for User
```typescript
const shares = await this.shareService.getSharesByUser(userId);
const postCount = new Set(shares.map(s => s.postId)).size;
console.log(`User shared ${shares.length} times covering ${postCount} posts`);
```

### Find Most-Shared Posts
```typescript
const posts = await this.postService.getAllPublished();
const mostShared = await Promise.all(
  posts.map(async (p) => ({
    postId: p.id,
    shareCount: await this.shareService.getShareCount(p.id)
  }))
);
mostShared.sort((a, b) => b.shareCount - a.shareCount);
```

---

## Module Setup

Already configured in `engagement.module.ts`:

```typescript
@Module({
  imports: [DatabaseModule],
  providers: [ReactionService, CommentService, ShareService],
  exports: [ReactionService, CommentService, ShareService],
})
export class EngagementModule {}
```

No additional setup needed!

---

## Types

```typescript
interface Share {
  id: string;              // share-<uuid>
  postId: string;         // Which post
  sharedBy: string;       // Who shared
  sharedWith: string[];   // Who got it
  sharedAt: string;       // When (ISO 8601)
  recipientCount: number; // Count
}

interface ShareDto {
  postId: string;
  recipientIds: string[];
}
```

---

## See Also

- **Full Spec:** `ISSUE_13_SHARESERVICE_SPEC.md`
- **Implementation:** `apps/api/src/engagement/share.service.ts`
- **Module:** `apps/api/src/engagement/engagement.module.ts`
- **Tests:** `apps/api/src/engagement/engagement.service.spec.ts`
- **Requirements:** `REQUIREMENTS.md` § "Employee Engagement → Share"

