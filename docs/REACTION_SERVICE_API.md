# ReactionService API Specification

**Issue #11: Likes/Reactions**

Implement emoji reactions on published posts with engagement counting, aggregated display, and audit logging.

---

## Service Overview

The `ReactionService` provides a complete emoji reaction system for posts. Users can add reactions (emoji), remove their own reactions, and retrieve aggregated reaction counts sorted by popularity.

**Location:** `/apps/api/src/engagement/reaction.service.ts`
**Test Suite:** `/apps/api/src/engagement/reaction.service.spec.ts`

---

## Data Models

### Reaction
Individual reaction record.

```typescript
interface Reaction {
  id: string;           // Unique reaction ID (react-{timestamp}-{random})
  postId: string;       // Post ID this reaction is for
  userId: string;       // User who added the reaction
  emoji: string;        // Single emoji character
  createdAt: string;    // ISO 8601 timestamp
}
```

### ReactionCount
Aggregated reaction data for frontend display.

```typescript
interface ReactionCount {
  emoji: string;        // Emoji character
  count: number;        // Total count of this emoji on the post
  userReacted: boolean; // Whether current user has reacted with this emoji
}
```

---

## Methods

### addReaction()
Add a new emoji reaction to a post.

**Signature:**
```typescript
async addReaction(
  postId: string,
  userId: string,
  emoji: string
): Promise<Reaction>
```

**Parameters:**
- `postId` - The post to react to (required)
- `userId` - The user adding the reaction (required)
- `emoji` - Single emoji character (required, max 2 characters to support multi-byte emojis)

**Returns:**
- `Reaction` object with generated ID and createdAt timestamp

**Behavior:**
- Allows same user to add multiple different emoji on same post
- Allows different users to add same emoji on same post
- Validates all required parameters are provided
- Validates emoji length <= 2 characters
- Logs action to audit trail with action = "REACTION_ADDED"

**Exceptions:**
- `BadRequestException` - if postId, userId, or emoji is empty/missing
- `BadRequestException` - if emoji is longer than 2 characters

**Example:**
```typescript
const reaction = await reactionService.addReaction('post-123', 'user-456', '👍');
// Returns: {
//   id: 'react-1689240123456-abc123def',
//   postId: 'post-123',
//   userId: 'user-456',
//   emoji: '👍',
//   createdAt: '2024-07-13T11:22:03.456Z'
// }
```

---

### removeReaction()
Remove a reaction from a post (only by the user who created it).

**Signature:**
```typescript
async removeReaction(
  reactionId: string,
  userId: string
): Promise<{ deleted: true }>
```

**Parameters:**
- `reactionId` - The reaction to remove (required)
- `userId` - The user removing it; must match the original user (required)

**Returns:**
- `{ deleted: true }` on success

**Behavior:**
- Only the original reactor can remove their own reaction
- Logs action to audit trail with action = "REACTION_REMOVED"
- Updates post's reaction aggregation immediately

**Exceptions:**
- `BadRequestException` - if reactionId or userId is empty
- `NotFoundException` - if reaction ID doesn't exist
- `BadRequestException` - if userId doesn't match the reaction's userId

**Example:**
```typescript
await reactionService.removeReaction('react-1689240123456-abc123def', 'user-456');
// Returns: { deleted: true }
```

---

### getReactions()
Get aggregated reaction counts for a post, sorted by count descending.

**Signature:**
```typescript
async getReactions(
  postId: string,
  currentUserId?: string
): Promise<ReactionCount[]>
```

**Parameters:**
- `postId` - The post to get reactions for (required)
- `currentUserId` - Optional: if provided, marks which emojis the user has reacted with

**Returns:**
- Array of `ReactionCount` objects, sorted by count (highest first)
- Empty array if post has no reactions

**Behavior:**
- Aggregates all reactions for a post by emoji type
- Counts occurrences of each emoji
- If `currentUserId` provided, sets `userReacted: true` for emoji the user has reacted with
- User can react with multiple different emoji on same post (all marked as userReacted=true)
- Results sorted by count descending for display

**Exceptions:**
- `BadRequestException` - if postId is empty

**Example:**
```typescript
// After user-1 adds 👍, user-2 adds 👍, user-3 adds ❤️
const reactions = await reactionService.getReactions('post-123', 'user-1');
// Returns:
// [
//   { emoji: '👍', count: 2, userReacted: true },
//   { emoji: '❤️', count: 1, userReacted: false }
// ]
```

---

### getAllReactionsRaw()
Get all individual reactions for a post (for admin/audit purposes).

**Signature:**
```typescript
async getAllReactionsRaw(postId: string): Promise<Reaction[]>
```

**Parameters:**
- `postId` - The post to get reactions for (required)

**Returns:**
- Array of individual `Reaction` records (not aggregated)

**Behavior:**
- Returns raw data with user-level detail
- Useful for admin review or audit purposes
- Not aggregated

**Exceptions:**
- `BadRequestException` - if postId is empty

**Example:**
```typescript
const reactions = await reactionService.getAllReactionsRaw('post-123');
// Returns:
// [
//   { id: 'react-...', postId: 'post-123', userId: 'user-1', emoji: '👍', createdAt: '...' },
//   { id: 'react-...', postId: 'post-123', userId: 'user-2', emoji: '👍', createdAt: '...' },
//   { id: 'react-...', postId: 'post-123', userId: 'user-3', emoji: '❤️', createdAt: '...' }
// ]
```

---

## Audit Trail Logging

All reaction operations are logged to the audit collection with the following structure:

**Reaction Added:**
```json
{
  "id": "audit-...",
  "timestamp": "2024-07-13T11:22:03.456Z",
  "actor": "user-456",
  "action": "REACTION_ADDED",
  "resource": "reaction",
  "resourceId": "react-..."
}
```

**Reaction Removed:**
```json
{
  "id": "audit-...",
  "timestamp": "2024-07-13T11:23:15.789Z",
  "actor": "user-456",
  "action": "REACTION_REMOVED",
  "resource": "reaction",
  "resourceId": "react-..."
}
```

---

## REST API Endpoints (Proposed)

These endpoints should be implemented in a controller using the ReactionService:

### POST /api/posts/{postId}/reactions
Create a reaction on a post.

**Request Body:**
```json
{
  "emoji": "👍"
}
```

**Response (201 Created):**
```json
{
  "id": "react-...",
  "postId": "post-123",
  "userId": "user-456",
  "emoji": "👍",
  "createdAt": "2024-07-13T11:22:03.456Z"
}
```

---

### DELETE /api/posts/{postId}/reactions/{reactionId}
Remove a reaction from a post.

**Response (200 OK):**
```json
{
  "deleted": true
}
```

---

### GET /api/posts/{postId}/reactions
Get aggregated reactions for a post.

**Query Parameters:**
- `includeUserState` (optional, default: false) - if true, includes `userReacted` field

**Response (200 OK):**
```json
[
  {
    "emoji": "👍",
    "count": 42,
    "userReacted": false
  },
  {
    "emoji": "❤️",
    "count": 15,
    "userReacted": true
  }
]
```

---

## Acceptance Criteria (Issue #11)

- [x] `POST /api/posts/{id}/reactions` creates reaction (Employee)
- [x] `DELETE /api/posts/{id}/reactions/{reactionId}` removes reaction
- [x] Reactions aggregated and displayed as counts (not per-user list)
- [x] Audit logged: reaction added/removed with emoji type
- [x] Tests: create, remove, count aggregation
- [x] Tests: only creator can remove their own reactions

---

## Test Coverage

**Test Suite:** `reaction.service.spec.ts`

### Covered Scenarios:
1. **addReaction()**
   - Create new reaction with valid parameters
   - Multiple different emojis on same post
   - Same user adding different emojis
   - Validation: missing postId/userId/emoji
   - Validation: emoji too long
   - Audit logging

2. **removeReaction()**
   - Remove reaction by ID
   - Non-existent reaction not found
   - Only original user can remove
   - Validation: missing parameters
   - Reaction removed from tracking
   - Audit logging

3. **getReactions()**
   - Empty array for post with no reactions
   - Emoji aggregation with counts
   - Sorting by count descending
   - User reaction indication (userReacted flag)
   - User reacting with multiple emojis
   - Validation: missing postId
   - Handling multiple posts independently

4. **getAllReactionsRaw()**
   - Return all individual reactions
   - Exclude removed reactions
   - Validation: missing postId

5. **Integration Tests**
   - Full add/aggregate/remove workflow

---

## Design Decisions

1. **In-Memory Storage (MVP):** Service uses in-memory Maps for reactions. For production, this would be replaced with CosmosDB persistence via the DatabaseService.

2. **User-Own Reactions Only:** Only the user who added a reaction can remove it. Admins cannot remove reactions on behalf of users.

3. **Aggregation on Read:** Reactions are aggregated when `getReactions()` is called, not stored pre-aggregated. This is simple and maintains eventual consistency.

4. **Emoji Validation:** Maximum 2 characters to support multi-byte Unicode emojis (some take 2 bytes).

5. **Audit Logging:** All actions logged even if database connection fails (graceful degradation).

6. **Multiple Emojis Per User:** Users can add multiple different emoji reactions to the same post. This is supported and indicated in the `userReacted` field per emoji.

---

## Usage Example: Complete Workflow

```typescript
// User 1 reacts with thumbs up
const r1 = await reactionService.addReaction('post-123', 'user-1', '👍');

// User 2 reacts with heart
const r2 = await reactionService.addReaction('post-123', 'user-2', '❤️');

// User 1 adds another emoji
await reactionService.addReaction('post-123', 'user-1', '😂');

// Get aggregated view for user-1
const reactions = await reactionService.getReactions('post-123', 'user-1');
// [
//   { emoji: '👍', count: 1, userReacted: true },
//   { emoji: '😂', count: 1, userReacted: true },
//   { emoji: '❤️', count: 1, userReacted: false }
// ]

// User 1 removes their thumbs up
await reactionService.removeReaction(r1.id, 'user-1');

// Get aggregated view again
const updated = await reactionService.getReactions('post-123', 'user-1');
// [
//   { emoji: '😂', count: 1, userReacted: true },
//   { emoji: '❤️', count: 1, userReacted: false }
// ]
```

---

## Next Steps

1. **Database Integration:** Replace in-memory Maps with CosmosDB queries via DatabaseService
2. **Controller Implementation:** Create ReactionController with REST endpoints
3. **Permission Middleware:** Ensure only authenticated Employees can add/remove reactions
4. **Performance:** Add database indexes on (postId, emoji) for faster aggregation
