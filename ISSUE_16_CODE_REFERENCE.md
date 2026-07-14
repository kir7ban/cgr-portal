# Issue #16: ArchiveService - Code Reference

**Location:** `/apps/api/src/advanced/archive.service.ts`  
**Lines of Code:** ~400  
**Status:** ✓ Complete  

---

## Service Method Reference

### 1. archiveOldPosts()

**Signature:**
```typescript
async archiveOldPosts(
  olderThanDays: number = 365,
  maxBatchSize: number = 1000,
): Promise<ArchiveBatchResult>
```

**Purpose:** Main batch job for archiving old posts

**Logic Flow:**
1. Generate batch ID: `batch-archive-${Date.now()}`
2. Calculate cutoff date: `now - olderThanDays days`
3. Query all posts from database
4. Filter by: `createdAt < cutoffDate && state === 'PUBLISHED' && !archived`
5. Slice to `maxBatchSize` limit
6. For each post:
   - Update post state to ARCHIVED
   - Store in `archivedPosts` map
   - Store timestamp in `archiveTimestamps` map
   - Create audit entry
   - Increment success count
   - Catch errors and add to errors array
7. Return `ArchiveBatchResult` with counts, IDs, errors, duration

**Time Complexity:** O(n) where n = posts to archive

**Database Operations:**
- 1 query: Get all posts
- n updates: Update each post state
- n inserts: Insert audit entries

**Error Handling:**
- Try-catch around each post update
- Partial failures don't abort batch
- All errors collected in errors array
- Batch result returned even on partial failure

---

### 2. getBatchResult()

**Signature:**
```typescript
async getBatchResult(batchId: string): Promise<ArchiveBatchResult | undefined>
```

**Purpose:** Retrieve specific batch result by ID

**Logic:**
```typescript
return this.batchHistory.get(batchId);
```

**Time Complexity:** O(1) map lookup

**Use Case:** Admin dashboard querying batch status

---

### 3. getRecentBatches()

**Signature:**
```typescript
async getRecentBatches(limit: number = 100): Promise<ArchiveBatchResult[]>
```

**Purpose:** Get recent batches sorted by completion time (newest first)

**Logic:**
1. Convert map to array: `Array.from(this.batchHistory.values())`
2. Sort by `completedAt` DESC
3. Slice to limit

**Time Complexity:** O(k log k) where k = batch history size

**Example:**
```typescript
const batches = await archiveService.getRecentBatches(10);
// Returns last 10 batches, newest first
```

---

### 4. getArchivedPost()

**Signature:**
```typescript
async getArchivedPost(postId: string): Promise<Post | undefined>
```

**Purpose:** Get single archived post by ID

**Logic:**
```typescript
return this.archivedPosts.get(postId);
```

**Time Complexity:** O(1) map lookup

---

### 5. getAllArchivedPosts()

**Signature:**
```typescript
async getAllArchivedPosts(): Promise<Post[]>
```

**Purpose:** Get all archived posts

**Logic:**
```typescript
return Array.from(this.archivedPosts.values());
```

**Time Complexity:** O(n) where n = archived posts

**Note:** For large archives (1000+), consider pagination in production

---

### 6. getArchivedPostCount()

**Signature:**
```typescript
async getArchivedPostCount(): Promise<number>
```

**Purpose:** Get count of archived posts

**Logic:**
```typescript
return this.archivedPosts.size;
```

**Time Complexity:** O(1)

---

### 7. getArchiveStats()

**Signature:**
```typescript
async getArchiveStats(): Promise<ArchiveStats>
```

**Purpose:** Get comprehensive archive statistics

**Logic:**
1. Convert archivedPosts map to array
2. If empty, return zeros
3. Calculate total size: sum of `title.length + content.length`
4. Sort by createdAt to find oldest/newest
5. Group by month using map:
   - Extract YYYY-MM from each createdAt
   - Count posts per month
6. Return ArchiveStats object

**Time Complexity:** O(n) where n = archived posts

**Returned Metrics:**
- `totalArchivedPosts` - count
- `totalArchivedPostsSize` - bytes (estimate)
- `oldestArchivedPost` - first by creation date
- `newestArchivedPost` - last by creation date
- `archivesByMonth` - distribution by month

**Example:**
```typescript
const stats = await archiveService.getArchiveStats();
// {
//   totalArchivedPosts: 5847,
//   totalArchivedPostsSize: 125847392,
//   oldestArchivedPost: {
//     id: 'post-001',
//     archivedAt: '2025-07-13T02:00:00Z',
//     originalPublishDate: '2023-01-15T10:30:00Z'
//   },
//   newestArchivedPost: { ... },
//   archivesByMonth: [
//     { month: '2023-01', count: 45 },
//     { month: '2023-02', count: 67 }
//   ]
// }
```

---

### 8. restoreArchivedPost()

**Signature:**
```typescript
async restoreArchivedPost(postId: string, userId: string): Promise<Post>
```

**Purpose:** Restore archived post to PUBLISHED state

**Logic:**
1. Get post from `archivedPosts` map
2. If not found, throw error
3. Update post state to PUBLISHED via DatabaseService
4. Remove from `archivedPosts` map
5. Remove from `archiveTimestamps` map
6. Create audit entry:
   - actor: userId
   - action: restore_post
7. Return restored post

**Time Complexity:** O(1)

**Side Effects:**
- Database update to post state
- Database insert to audit trail
- Removes from in-memory archive maps

**Audit Entry:**
```typescript
{
  id: `audit-restore-${postId}-${Date.now()}`,
  timestamp: new Date().toISOString(),
  actor: userId,
  action: 'restore_post',
  resource: 'post',
  resourceId: postId
}
```

---

### 9. isArchived()

**Signature:**
```typescript
async isArchived(postId: string): Promise<boolean>
```

**Purpose:** Quick boolean check if post is archived

**Logic:**
```typescript
return this.archivedPosts.has(postId);
```

**Time Complexity:** O(1)

**Use Case:** Feed filtering, state verification

---

## Helper Methods

### getAllPosts() [Private]

**Signature:**
```typescript
private async getAllPosts(): Promise<Post[]>
```

**Purpose:** Query all posts from database (for filtering)

**Current Implementation:**
```typescript
const collections = await this.databaseService.getCollections();
if (!collections.includes('posts')) {
  return [];
}
// Returns empty array (would query CosmosDB in production)
return [];
```

**Production TODO:** Implement actual CosmosDB query

---

## Data Structures

### In-Memory Maps

**archivedPosts**
```typescript
private archivedPosts: Map<string, Post> = new Map();
```
- Key: postId
- Value: Post object with state='ARCHIVED'
- Lookup: O(1)

**archiveTimestamps**
```typescript
private archiveTimestamps: Map<string, string> = new Map();
```
- Key: postId
- Value: ISO 8601 timestamp when archived
- Lookup: O(1)

**batchHistory**
```typescript
private batchHistory: Map<string, ArchiveBatchResult> = new Map();
```
- Key: batchId
- Value: ArchiveBatchResult object
- Lookup: O(1)

---

## Logging

**Logger Instance:**
```typescript
private readonly logger = new Logger('ArchiveService');
```

**Log Points:**

1. **Batch Start**
   ```typescript
   this.logger.debug(`[${batchId}] Starting archive batch...`);
   ```

2. **Posts Found**
   ```typescript
   this.logger.log(`[${batchId}] Found ${postsToArchive.length} posts...`);
   ```

3. **Per Post Success**
   ```typescript
   this.logger.debug(`[${batchId}] Archived post ${post.id}`);
   ```

4. **Per Post Failure**
   ```typescript
   this.logger.warn(`[${batchId}] Failed to archive: ${errorMsg}`);
   ```

5. **Batch Complete**
   ```typescript
   this.logger.log(`[${batchId}] Archive completed: ${successCount}...`);
   ```

6. **Batch Error**
   ```typescript
   this.logger.error(`[${batchId}] Archive batch failed:`, error);
   ```

---

## Error Scenarios

### Database Connection Error
```typescript
try {
  await this.databaseService.updatePost(post.id, { state: 'ARCHIVED' });
} catch (error) {
  errors.push({ postId: post.id, error: error.message });
  // Continue to next post
}
```

### Invalid Archive Data
```typescript
const postsToArchive = allPosts.filter((post) => {
  const createdDate = new Date(post.createdAt);
  return (
    createdDate < cutoffDate &&
    post.state === 'PUBLISHED' &&
    !this.archivedPosts.has(post.id)
  );
});
```

### Restore Non-Archived Post
```typescript
const archivedPost = this.archivedPosts.get(postId);
if (!archivedPost) {
  throw new Error(`Archived post ${postId} not found`);
}
```

---

## Integration with DatabaseService

### Update Post
```typescript
const archivedPost = await this.databaseService.updatePost(post.id, {
  state: 'ARCHIVED',
});
```

**Expected Interface:**
```typescript
async updatePost(id: string, updates: Partial<Post>): Promise<Post>
```

### Insert Audit Entry
```typescript
await this.databaseService.insertAudit({
  id: `audit-archive-${post.id}-${Date.now()}`,
  timestamp: new Date().toISOString(),
  actor: 'system',
  action: 'archive_post',
  resource: 'post',
  resourceId: post.id,
});
```

**Expected Interface:**
```typescript
async insertAudit(entry: AuditEntry): Promise<AuditEntry>
```

---

## Constructor & Initialization

**Constructor:**
```typescript
constructor(private databaseService: DatabaseService) {}
```

**What Happens:**
- DatabaseService injected by NestJS
- In-memory maps initialized empty
- Logger configured with context 'ArchiveService'
- Service ready to accept requests

**No Initialization Hooks:**
- No OnModuleInit
- No OnApplicationBootstrap
- Service starts empty (loads archived posts on demand)

---

## Performance Optimization Opportunities

### Current Bottlenecks
1. **getAllPosts()** - Would query all posts (O(n) database)
2. **Sequential Updates** - Updates posts one at a time
3. **Per-Post Audits** - Creates audit entry per post

### Optimization Ideas

**Batch Database Operations:**
```typescript
// Instead of:
for (const post of postsToArchive) {
  await this.databaseService.updatePost(post.id, ...);
  await this.databaseService.insertAudit(...);
}

// Do:
const updateOps = postsToArchive.map(post => ({...}));
await this.databaseService.batchUpdatePosts(updateOps);
await this.databaseService.batchInsertAudits(auditEntries);
```

**Concurrent Processing:**
```typescript
await Promise.all(postsToArchive.map(post => archivePost(post)));
```

**Archive Collection:**
```typescript
// Move archived posts to separate CosmosDB collection
// Reduces main posts collection size
```

---

## Scheduling Implementation Template

### Add to ArchiveService

```typescript
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ArchiveService {
  // ... existing code ...

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledArchiveJob(): Promise<void> {
    this.logger.log('Starting scheduled daily archive batch job');
    try {
      const result = await this.archiveOldPosts(365, 1000);
      this.logger.log(
        `Archive batch completed: ${result.archivedCount} posts archived, ${result.failedCount} failed`
      );
    } catch (error) {
      this.logger.error('Scheduled archive batch failed', error);
      // Could send alert notification here
    }
  }
}
```

### Register in AppModule

```typescript
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AdvancedModule,
    // ... other modules
  ],
})
export class AppModule {}
```

---

## Testing Utilities

### Mock DatabaseService
```typescript
const mockDatabaseService = {
  updatePost: jest.fn().mockResolvedValue({
    id: 'post-1',
    state: 'ARCHIVED'
  }),
  insertAudit: jest.fn().mockResolvedValue({}),
  getCollections: jest.fn().mockResolvedValue(['posts']),
};
```

### Test Batch Job
```typescript
it('should archive posts older than threshold', async () => {
  // Setup: Create posts with old and new dates
  // Call: archiveOldPosts(365, 100)
  // Verify: archivedCount > 0, correct posts archived
});
```

### Test Partial Failure
```typescript
it('should handle partial failures', async () => {
  // Setup: Some posts fail to update
  // Call: archiveOldPosts()
  // Verify: failedCount > 0, errors populated, continued processing
});
```

---

## Common Patterns

### Check Before Operation
```typescript
const post = this.archivedPosts.get(postId);
if (!post) {
  throw new Error(`Post ${postId} not found in archive`);
}
```

### Convert Map to Array
```typescript
const array = Array.from(this.archivedPosts.values());
```

### Create Timestamped ID
```typescript
const id = `batch-archive-${Date.now()}`;
const auditId = `audit-archive-${postId}-${Date.now()}`;
```

### Group and Count
```typescript
const byMonth: { [key: string]: number } = {};
archivedPostsArray.forEach((post) => {
  const date = new Date(post.createdAt);
  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
});
```

---

## Dependencies & Imports

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService, Post, AuditEntry } from '../database/database.service';
```

**External:**
- `@nestjs/common` - Injectable, Logger

**Internal:**
- `DatabaseService` - Database persistence
- `Post` - Post interface
- `AuditEntry` - Audit interface

---

## File Structure

```
archive.service.ts
├── Imports
├── Interfaces
│   ├── ArchiveBatchResult
│   └── ArchiveStats
├── @Injectable()
├── ArchiveService class
│   ├── Constructor
│   ├── Private fields (maps, logger)
│   ├── Public methods (9)
│   │   ├── archiveOldPosts()
│   │   ├── getBatchResult()
│   │   ├── getRecentBatches()
│   │   ├── getArchivedPost()
│   │   ├── getAllArchivedPosts()
│   │   ├── getArchivedPostCount()
│   │   ├── getArchiveStats()
│   │   ├── restoreArchivedPost()
│   │   └── isArchived()
│   └── Private methods (1)
│       └── getAllPosts()
```

---

## API Response Examples

### Batch Result
```json
{
  "batchId": "batch-archive-1694581200000",
  "startedAt": "2026-07-13T02:00:00.000Z",
  "completedAt": "2026-07-13T02:03:45.123Z",
  "archivedCount": 847,
  "failedCount": 2,
  "postIds": ["post-001", "post-002", "..."],
  "errors": [
    {
      "postId": "post-999",
      "error": "Database constraint violation"
    }
  ],
  "duration": 225123
}
```

### Archive Stats
```json
{
  "totalArchivedPosts": 5847,
  "totalArchivedPostsSize": 125847392,
  "oldestArchivedPost": {
    "id": "post-001",
    "archivedAt": "2025-07-13T02:00:00Z",
    "originalPublishDate": "2023-01-15T10:30:00Z"
  },
  "newestArchivedPost": {
    "id": "post-999",
    "archivedAt": "2026-07-13T02:00:00Z",
    "originalPublishDate": "2025-06-20T14:45:00Z"
  },
  "archivesByMonth": [
    { "month": "2023-01", "count": 45 },
    { "month": "2023-02", "count": 67 }
  ]
}
```

---

## Type Definitions

```typescript
// From database.service.ts
export interface Post {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  state: 'DRAFT' | 'SUBMITTED' | 'PUBLISHED' | 'REJECTED' | 'REVOKED' | 'ARCHIVED';
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  resourceId?: string;
}

// New in archive.service.ts
export interface ArchiveBatchResult {
  batchId: string;
  startedAt: string;
  completedAt: string;
  archivedCount: number;
  failedCount: number;
  postIds: string[];
  errors: Array<{ postId: string; error: string }>;
  duration: number;
}

export interface ArchiveStats {
  totalArchivedPosts: number;
  totalArchivedPostsSize: number;
  oldestArchivedPost?: {
    id: string;
    archivedAt: string;
    originalPublishDate: string;
  };
  newestArchivedPost?: {
    id: string;
    archivedAt: string;
    originalPublishDate: string;
  };
  archivesByMonth: Array<{ month: string; count: number }>;
}
```

---

**End of Code Reference**

