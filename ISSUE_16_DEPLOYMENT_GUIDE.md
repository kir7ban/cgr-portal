# Issue #16: ArchiveService Deployment Guide

**Created:** 2026-07-13  
**Component:** Advanced Module - Post Archival  
**Status:** Ready for Deployment  

---

## Quick Start

### 1. Verify Service Implementation
```bash
cat apps/api/src/advanced/archive.service.ts
# ✓ Should show ArchiveService class with 9 public methods
```

### 2. Enable NestJS Scheduling (if not already enabled)

**In `apps/api/src/app.module.ts`:**
```typescript
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),  // ← Add this
    AdvancedModule,
    DatabaseModule,
    // ... other modules
  ],
})
export class AppModule {}
```

**Install schedule package (if needed):**
```bash
npm install @nestjs/schedule
npm install --save-dev @types/node  # For CronExpression type
```

### 3. Add Scheduled Method to ArchiveService

**In `apps/api/src/advanced/archive.service.ts`:**
```typescript
import { Cron, CronExpression } from '@nestjs/schedule';

// Inside ArchiveService class, add this method:

@Cron(CronExpression.EVERY_DAY_AT_2AM)
async scheduledArchiveJob(): Promise<void> {
  this.logger.log('Starting scheduled daily archive batch job');
  try {
    const result = await this.archiveOldPosts(365, 1000);
    this.logger.log(
      `Archive batch completed: ${result.archivedCount} posts archived, ` +
      `${result.failedCount} failed in ${result.duration}ms`
    );
  } catch (error) {
    this.logger.error('Scheduled archive batch job failed', error);
    // TODO: Send alert notification (Slack, email, etc.)
  }
}
```

### 4. Run Tests
```bash
cd apps/api
npm test -- advanced.service.spec.ts
```

### 5. Start Service
```bash
npm run dev
# or
npm start
```

---

## Configuration

### Environment Variables

**Optional configuration in `.env`:**
```bash
# Archive threshold (default: 365 days)
ARCHIVE_OLD_POSTS_THRESHOLD_DAYS=365

# Batch size (default: 1000 posts)
ARCHIVE_BATCH_SIZE=1000

# Schedule (default: 2 AM UTC daily)
# Format: cron expression "minute hour day month dayOfWeek"
ARCHIVE_JOB_SCHEDULE=0 2 * * *
```

### Load Configuration (if using ConfigService)

```typescript
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ArchiveService {
  private readonly olderThanDays: number;
  private readonly batchSize: number;

  constructor(
    private databaseService: DatabaseService,
    private configService: ConfigService,
  ) {
    this.olderThanDays = this.configService.get('ARCHIVE_OLD_POSTS_THRESHOLD_DAYS', 365);
    this.batchSize = this.configService.get('ARCHIVE_BATCH_SIZE', 1000);
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledArchiveJob(): Promise<void> {
    const result = await this.archiveOldPosts(this.olderThanDays, this.batchSize);
    // ...
  }
}
```

---

## Deployment Steps

### Step 1: Pre-Deployment Checklist

- [ ] Code review completed
- [ ] Unit tests passing
- [ ] Integration tests with DatabaseService passing
- [ ] No database schema changes needed (state field already supports 'ARCHIVED')
- [ ] Audit table retention policy verified (3 years)
- [ ] Environment variables configured
- [ ] Monitoring/alerting configured
- [ ] Rollback plan documented

### Step 2: Database Verification

**Verify Post Table Schema:**
```sql
-- CosmosDB SQL
SELECT * FROM c WHERE c.state = 'ARCHIVED' LIMIT 1
-- Should return empty initially

-- Check createdAt index
SELECT c.createdAt FROM c WHERE c.state = 'PUBLISHED' ORDER BY c.createdAt DESC LIMIT 1
```

**Verify Audit Table:**
```sql
-- Audit table should exist with immutable constraints
SELECT * FROM c WHERE c.action = 'archive_post' LIMIT 1
```

### Step 3: Deploy Service

**Deploy to Staging:**
```bash
# Build
npm run build

# Run tests
npm test

# Deploy (using your deployment system)
# e.g., Docker, Azure Deploy, GitHub Actions, etc.
```

**Verify Deployment:**
```bash
# Check service started
curl http://localhost:3000/health

# Service should be injected and ready
```

### Step 4: Manual Testing

**Option A: Trigger Batch Manually**

Create test endpoint in controller:
```typescript
import { ArchiveService } from './advanced/archive.service';

@Controller('admin/archive')
export class ArchiveController {
  constructor(private archiveService: ArchiveService) {}

  @Post('batch')
  async triggerBatch(
    @Query('olderThanDays') olderThanDays: number = 365,
    @Query('batchSize') batchSize: number = 100, // Smaller for testing
  ) {
    return await this.archiveService.archiveOldPosts(olderThanDays, batchSize);
  }

  @Get('stats')
  async getStats() {
    return await this.archiveService.getArchiveStats();
  }
}
```

**Test Request:**
```bash
# Trigger batch (archive posts >365 days old, up to 100)
curl -X POST http://localhost:3000/admin/archive/batch?olderThanDays=365&batchSize=100

# Expected Response:
# {
#   "batchId": "batch-archive-1694581200000",
#   "startedAt": "2026-07-13T...",
#   "completedAt": "2026-07-13T...",
#   "archivedCount": 42,
#   "failedCount": 0,
#   "postIds": [...],
#   "errors": [],
#   "duration": 5432
# }

# Get statistics
curl http://localhost:3000/admin/archive/stats
```

### Step 5: Verify Schedule

**Check Logs:**
```bash
# Should see scheduled job start at 2 AM UTC
tail -f logs/api.log | grep "Archive"

# Example log output:
# [2026-07-14 02:00:00] Starting scheduled daily archive batch job
# [2026-07-14 02:03:45] Archive batch completed: 847 posts archived, 2 failed in 225123ms
```

**Or via Monitoring:**
- Check admin dashboard for batch history
- Verify batch result in database via query
- Check metrics: archive count, duration, success rate

---

## Post-Deployment Verification

### Checklist

- [ ] Service started without errors
- [ ] No database connection errors
- [ ] No permission/authorization errors
- [ ] Schedule decorator registered (check logs at 2 AM UTC)
- [ ] Batch can be triggered manually
- [ ] Batch results tracked in service memory
- [ ] Audit entries created and persisted
- [ ] Archive statistics calculated correctly
- [ ] Logging shows all operations
- [ ] No performance degradation

### Monitoring Metrics

Track these metrics in your monitoring system:

1. **Batch Execution Time**
   - Should be 30-60 seconds per 1,000 posts
   - Alert if > 5 minutes

2. **Success Rate**
   - Target: 99%+
   - Alert if < 95%

3. **Archive Size**
   - Monitor total archived posts count
   - Estimate storage growth

4. **Failure Rate**
   - Track failed posts per batch
   - Alert if > 10

### Example Monitoring Setup (DataDog / New Relic)

```typescript
// In ArchiveService, add metrics
import { InjectMetric } from '@nestjs/metrics'; // Or your monitoring library

async archiveOldPosts(...) {
  const startTime = Date.now();
  
  try {
    // ... batch processing ...
    
    this.metrics.increment('archive.posts.success', result.archivedCount);
    this.metrics.increment('archive.posts.failed', result.failedCount);
    this.metrics.timing('archive.batch.duration', Date.now() - startTime);
  } catch (error) {
    this.metrics.increment('archive.batch.error');
  }
}
```

---

## Rollback Plan

### If Issues Occur

**Option 1: Disable Schedule (keep service running)**
```typescript
// Comment out @Cron decorator temporarily
// @Cron(CronExpression.EVERY_DAY_AT_2AM)
async scheduledArchiveJob(): Promise<void> {
  // Batch job disabled
}
```

**Option 2: Restore from Backup**
```sql
-- If posts incorrectly archived, restore via audit trail
UPDATE posts SET state = 'PUBLISHED' 
WHERE id IN (
  SELECT DISTINCT resourceId FROM audit 
  WHERE action = 'archive_post' 
  AND timestamp > '2026-07-13T02:00:00Z'
)
```

**Option 3: Full Rollback**
```bash
# Rollback deployment
kubectl rollout undo deployment/cgr-api -n production

# Or using your deployment system
az webapp deployment slot swap -g rg-cgr -n cgr-api --slot staging
```

---

## Troubleshooting

### Issue: Archive batch doesn't run at 2 AM

**Solution:**
1. Verify ScheduleModule.forRoot() in AppModule
2. Check server timezone (should be UTC)
3. Verify @Cron decorator syntax
4. Check service logs for errors

```bash
# Check logs
tail -100 logs/api.log | grep -i archive

# Check system timezone
date

# Restart service
npm restart
```

### Issue: Batch runs but archive count is 0

**Solution:**
1. Verify posts exist with state='PUBLISHED'
2. Verify createdAt timestamps are >365 days old
3. Manually test:
```typescript
const allPosts = await this.databaseService.getCollections();
console.log('Collections:', allPosts);

const result = await archiveService.archiveOldPosts(30, 100); // 30 days
console.log('Result:', result);
```

### Issue: Database connection errors

**Solution:**
1. Verify COSMOSDB_CONNECTION_STRING environment variable
2. Test connection:
```bash
node -e "const db = require('./database'); db.connect()"
```
3. Check CosmosDB firewall rules
4. Verify credentials

### Issue: Audit entries not created

**Solution:**
1. Verify DatabaseService.insertAudit() works
2. Check audit table permissions
3. Verify DatabaseService injection in ArchiveService
4. Test manually:
```typescript
const audit = await databaseService.insertAudit({
  id: 'test-' + Date.now(),
  timestamp: new Date().toISOString(),
  actor: 'test',
  action: 'test',
  resource: 'test',
});
```

---

## Monitoring & Alerts

### Key Metrics to Track

1. **Batch Job Success**
   - Trigger: Batch fails or doesn't run
   - Action: Check logs, verify database
   - Severity: High

2. **High Failure Rate**
   - Trigger: >10% posts fail in batch
   - Action: Investigate failed post errors
   - Severity: Medium

3. **Long Batch Duration**
   - Trigger: Batch takes >5 minutes
   - Action: Check database load, optimize queries
   - Severity: Medium

4. **Archive Growth**
   - Trigger: Monitor size/count trends
   - Action: Plan for storage/performance
   - Severity: Low (informational)

### Example Alert Rules

```yaml
# Prometheus/Grafana example
alert_rules:
  - alert: ArchiveBatchFailed
    expr: increase(archive.batch.error[1d]) > 0
    for: 5m
    annotations:
      summary: "Archive batch job failed"
      
  - alert: ArchiveHighFailureRate
    expr: |
      archive.posts.failed / (archive.posts.success + archive.posts.failed) > 0.10
    for: 10m
    annotations:
      summary: "Archive failure rate >10%"
      
  - alert: ArchiveBatchSlow
    expr: archive.batch.duration > 300000  # 5 minutes
    for: 5m
    annotations:
      summary: "Archive batch taking >5 minutes"
```

---

## Operations Runbook

### Daily Operations

**Morning Check (UTC+0):**
```bash
# 1. Verify batch ran
curl http://api.internal/admin/archive/recent?limit=1

# 2. Check success rate
# Expected: archivedCount > 0, failedCount = 0

# 3. Verify audit entries created
# SELECT COUNT(*) FROM audit WHERE action = 'archive_post' AND timestamp > '<yesterday>'
```

**Weekly Review:**
```bash
# Check statistics
curl http://api.internal/admin/archive/stats

# Review batch history
curl http://api.internal/admin/archive/recent?limit=7

# Expected trends:
# - Consistent post count per week
# - Zero or low failures
# - Consistent duration
```

**Monthly Review:**
```bash
# Review archive growth
SELECT totalArchivedPosts FROM stats
# Compare with previous month

# Check storage usage
SELECT SUM(totalArchivedPostsSize) FROM archive_stats
# Monitor for growth

# Review compliance
SELECT COUNT(*) FROM audit 
WHERE action IN ('archive_post', 'restore_post')
AND timestamp > '<last 30 days>'
```

---

## Performance Tuning (Production)

### If Batch Takes Too Long

**Option 1: Reduce batch size**
```typescript
// From 1000 to 500 per batch
const result = await archiveService.archiveOldPosts(365, 500);
```

**Option 2: Increase batch frequency**
```typescript
// Run twice daily instead of once
@Cron('0 2 * * *')  // 2 AM
async morningArchive() { await this.archiveOldPosts(365, 500); }

@Cron('0 14 * * *') // 2 PM
async afternoonArchive() { await this.archiveOldPosts(365, 500); }
```

**Option 3: Optimize database queries**
```typescript
// Add indexes on posts table
// - createdAt
// - state
// - combined (createdAt, state)
```

### If Database Load Is High

**Solution:**
1. Reduce batch size
2. Increase schedule interval (less frequent)
3. Migrate archived posts to separate collection
4. Implement bulk operations at database level

---

## Security Checklist

- [ ] ArchiveService injection is scoped correctly
- [ ] archiveOldPosts() only called by scheduled job or admin endpoints
- [ ] Admin endpoints require authentication/authorization
- [ ] Audit entries are immutable (DatabaseService enforces)
- [ ] No sensitive data in archive entries
- [ ] Logs don't expose personal data
- [ ] Database credentials secure in environment variables
- [ ] CosmosDB firewall rules restrict access
- [ ] API rate limiting on manual archive trigger

---

## Success Criteria

Service is successfully deployed when:

1. ✓ Service starts without errors
2. ✓ Scheduled job runs daily at 2 AM UTC
3. ✓ Batch processes posts >365 days old
4. ✓ Only PUBLISHED posts are archived
5. ✓ Audit entries created and persisted
6. ✓ Archive statistics calculated correctly
7. ✓ Post restoration works with audit logging
8. ✓ Monitoring and alerting configured
9. ✓ No performance degradation
10. ✓ Zero unhandled errors in logs

---

## Support Contacts

- **Backend Team:** [contact info]
- **Database Team:** [contact info]
- **DevOps Team:** [contact info]
- **On-Call:** [rotation schedule]

---

## Documentation References

- **Service Spec:** ISSUE_16_ARCHIVESERVICE_SPEC.md
- **Code Reference:** ISSUE_16_CODE_REFERENCE.md
- **Implementation Summary:** ISSUE_16_IMPLEMENTATION_SUMMARY.md
- **Service Code:** apps/api/src/advanced/archive.service.ts
- **Tests:** apps/api/src/advanced/advanced.service.spec.ts

---

## Sign-Off

**Ready for Deployment:** ✓ Yes

**Reviewed by:**
- [ ] Backend Team
- [ ] Database Team
- [ ] Security Team
- [ ] DevOps Team

**Date Deployed:** _______________

**Deployed By:** _______________

**Notes:** _______________

