# 🏗️ CGR Portal Architecture Review

## Pre-Frontend Build Assessment

### Quick Stats
- **Modules**: 8 Feature + 2 Infrastructure = 10 total
- **Controllers**: 13 HTTP endpoints
- **Friction Points**: 6 major
- **Deepening Candidates**: 4 strong recommendations

---

## 🎯 Candidate 1: Scattered Authorization Logic ⭐ STRONG PRIORITY

### Problem
Authorization logic is duplicated across 4+ services:
- `ApprovalService`: `validateAdminRole(userId)` → `['admin']`
- `PostCreationService`: `isCommsOfficer(userId)` → `['alice.smith']`
- `AudienceService`: `validateAdmin(userId)` → hardcoded check
- `RevocationService`: `ADMIN_USERS = ['bob.admin', 'admin.user', ...]`

**Impact**: 
- Security gap (different admin lists)
- Maintenance burden (edit 4+ files to add admin)
- Agent blindness (can't reason about permissions)
- No RBAC (hardcoded users, not roles)

### Solution
Create **AuthorizationService** with single method:
```typescript
enforceRole(userId: string, requiredRole: 'ADMIN' | 'COMMS_OFFICER'): void
```

### Benefits
- **Locality**: Authorization in ONE place
- **Leverage**: Every new feature gets RBAC for free
- **Agent-Navigable**: Find rules in one file
- **Frontend**: JWT includes roles → type-safe UI conditionals

---

## 🎯 Candidate 2: Duplicated Audit Trail Boilerplate ⭐ STRONG PRIORITY

### Problem
8 services repeat the same 5+ lines:
```typescript
const auditEntry: AuditEntry = {
  id: `audit-${Date.now()}-${Math.random()...}`,
  timestamp: new Date().toISOString(),
  actor: userId,
  action: 'ACTION_NAME',
  resource: 'resource_type',
  resourceId: postId,
};
await this.databaseService.insertAudit(auditEntry);
```

**Impact**:
- Copy-paste error prone
- Ad-hoc ID generation (inconsistent)
- Easy to forget audit when adding features
- Every test must mock databaseService.insertAudit()

### Solution
Create **AuditingService**:
```typescript
async logAction(actor: string, action: string, resource: string, resourceId: string)
```

### Benefits
- Boilerplate reduced by 90%
- Missing audit = IDE warning (unused return)
- Agent safety: one-liner ensures auditing
- Extension point (later route to Kafka/Event Bus)

---

## 🎯 Candidate 3: Missing Error & State Type Contracts 🟡 WORTH EXPLORING

### Problem
- State enums are strings: `post.state: string` (should be `PostState` union)
- Missing error response contract (success = `{success:true,data}`, error = NestJS default)
- No state machine definition (legal transitions undocumented)
- Frontend guesses state values

### Solution
- Define `PostState = 'DRAFT' | 'SUBMITTED' | 'PUBLISHED' | 'REJECTED' | 'REVOKED' | 'ARCHIVED'`
- Create `ApiErrorResponseDto` with `{ success: false; error: { code, message } }`
- Create `StateTransitionService`: `canTransition(from: PostState, to: PostState): boolean`
- Export state constants from `domain.ts`

### Benefits
- Type safety at compile time
- Frontend: import state constants, type-safe UI
- Agents see valid transitions without reading logic
- State machine always in sync with code

---

## 🎯 Candidate 4: Consolidate Cross-Cutting Concerns 🟡 WORTH EXPLORING

### Problem
- **No Logging**: Only ArchiveService logs. Production debugging is blind.
- **Duplicated Validation**: Media validation in PostService + EditService
- **Inconsistent Error Handling**: Some catch & fail, others throw
- **Duplicated Pagination**: Validation in 3 services

### Solution
- Create `ValidationService`: `validateMediaFiles()`, `validatePagination()`
- Enable NestJS `Logger` across all services
- Error handling middleware returns `{ success: false; error: ... }`
- Standardize error codes (VALIDATION_ERROR, NOT_FOUND, UNAUTHORIZED, CONFLICT)

### Benefits
- Validation rules in ONE place
- Observability: logging everywhere (production ready)
- Consistent error responses (frontend simpler)
- Agent: call ValidationService for all input checks

---

## 🎯 Recommended Implementation Order

### 1️⃣ AuthorizationService (1 hour) ⭐ HIGHEST PRIORITY
- **Blocks**: Frontend RBAC UI rendering
- **Impact**: Fixes security gap, agent navigability, frontend type safety
- **Do First**: Cannot skip

### 2️⃣ AuditingService (30 min) ⭐ HIGHEST PRIORITY
- **Blocks**: Can't add new features safely (easy to forget audit)
- **Impact**: 90% boilerplate reduction
- **Do After**: AuthorizationService

### 3️⃣ State Type Contracts (1.5 hours) 🟡 MEDIUM PRIORITY
- **Blocks**: Frontend type safety for state handling
- **Impact**: Compile-time safety, better DX
- **Do After**: Steps 1-2 (enables frontend work)

### 4️⃣ Cross-Cutting Concerns (2-3 hours) 🟡 MEDIUM PRIORITY
- **Blocks**: Nothing urgent (but important for production)
- **Impact**: Observability, consistent error handling
- **Do While**: Building frontend (can parallelize)

---

## Summary

**Total Effort**: ~6 hours to deepen all modules

**Frontend Unblocked After**: Steps 1-2 (90 min)
- AuthorizationService: RBAC logic centralized
- AuditingService: Safe to add new endpoints

**Recommended Timeline**:
- **Phase 1** (First 90 min): Steps 1-2 → Frontend development starts
- **Phase 2** (While frontend builds): Steps 3-4 → Production readiness

---

## Next Steps

Select a candidate to explore:
1. **AuthorizationService** - Detailed design, interfaces, test cases
2. **AuditingService** - Implementation plan, affected services
3. **State Type Contracts** - Type definitions, state machine rules
4. **Cross-Cutting Concerns** - ValidationService, Logger integration

Which would you like to deepen?
