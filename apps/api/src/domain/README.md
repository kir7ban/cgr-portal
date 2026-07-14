# Domain Layer - State Management

This directory contains domain-level types and services for managing post states and state transitions.

## Files

- `state-types.ts` - PostState type definition and constants
- `state-transition.service.ts` - State transition validation service
- `domain.module.ts` - NestJS module exporting domain services
- `index.ts` - Public API exports

## PostState Type

The `PostState` type enforces valid post states throughout the application:

```typescript
type PostState = 'DRAFT' | 'SUBMITTED' | 'PUBLISHED' | 'REJECTED' | 'REVOKED' | 'ARCHIVED';
```

### State Lifecycle

```
DRAFT
  ├─> SUBMITTED ──┬─> PUBLISHED ──┬─> REVOKED ──> ARCHIVED
  │               │                └─> ARCHIVED
  │               ├─> REJECTED ──┬─> DRAFT
  │               │              └─> ARCHIVED
  │               └─> DRAFT (feedback)
  └─> ARCHIVED
```

### State Descriptions

- **DRAFT**: Initial state when post is created. Only visible to creator.
- **SUBMITTED**: Post submitted for approval. Visible in approval queue.
- **PUBLISHED**: Post approved and visible to target audience.
- **REJECTED**: Post rejected during approval. Cannot be resubmitted.
- **REVOKED**: Published post that has been revoked by admin.
- **ARCHIVED**: Post archived and no longer visible.

## State Constants

Always use the `POST_STATES` constants instead of string literals:

```typescript
import { POST_STATES } from './domain/state-types';

// Good
if (post.state === POST_STATES.PUBLISHED) { ... }

// Bad - avoid string literals
if (post.state === 'PUBLISHED') { ... }
```

## StateTransitionService

Service for validating state transitions.

### Methods

#### `canTransition(from: PostState, to: PostState): boolean`

Check if a state transition is valid.

```typescript
const service = new StateTransitionService();
service.canTransition('DRAFT', 'SUBMITTED'); // true
service.canTransition('DRAFT', 'PUBLISHED'); // false
```

#### `getValidTransitions(from: PostState): PostState[]`

Get all valid target states from a given state.

```typescript
service.getValidTransitions('DRAFT');
// ['DRAFT', 'SUBMITTED', 'ARCHIVED']
```

#### `validateTransition(from: PostState, to: PostState): void`

Validate a transition and throw if invalid.

```typescript
service.validateTransition('DRAFT', 'PUBLISHED');
// Throws: BadRequestException('Invalid state transition from DRAFT to PUBLISHED')
```

## Valid State Transitions

| From      | To                                    |
|-----------|---------------------------------------|
| DRAFT     | DRAFT, SUBMITTED, ARCHIVED            |
| SUBMITTED | SUBMITTED, DRAFT, PUBLISHED, REJECTED |
| PUBLISHED | PUBLISHED, REVOKED, ARCHIVED          |
| REJECTED  | REJECTED, DRAFT, ARCHIVED             |
| REVOKED   | REVOKED, ARCHIVED                     |
| ARCHIVED  | ARCHIVED (terminal state)             |

All states can transition to themselves (idempotent operations).

## Usage Examples

### Creating a Post

```typescript
import { PostState, POST_STATES } from './domain/state-types';

const post: PostDocument = {
  id: 'post-123',
  title: 'Example',
  content: 'Content',
  createdBy: 'user-456',
  state: POST_STATES.DRAFT,  // Use constant
  createdAt: new Date().toISOString(),
};
```

### Validating State Transitions

```typescript
import { StateTransitionService } from './domain/state-transition.service';

@Injectable()
export class MyService {
  constructor(private stateTransition: StateTransitionService) {}

  async updatePostState(postId: string, newState: PostState) {
    const post = await this.getPost(postId);
    
    // Validate transition
    this.stateTransition.validateTransition(post.state, newState);
    
    // Update post
    post.state = newState;
    await this.savePost(post);
  }
}
```

### Type Safety

```typescript
// TypeScript enforces valid states at compile time
const state: PostState = 'DRAFT';      // ✓ Valid
const state: PostState = 'INVALID';    // ✗ Compile error
const state: PostState = POST_STATES.DRAFT; // ✓ Best practice

// Runtime validation
if (isValidPostState('DRAFT')) {       // ✓ Valid
  // state is typed as PostState
}
```

## Testing

Run tests with:

```bash
npm test -- state-types.spec.ts
npm test -- state-transition.service.spec.ts
```

Or run manual verification:

```bash
npx ts-node src/domain/manual-test.ts
```

## Integration

The DomainModule is imported in `app.module.ts` and makes `StateTransitionService` available throughout the application:

```typescript
@Module({
  imports: [
    // ...
    DomainModule,
    // ...
  ],
})
export class AppModule {}
```

Services can inject `StateTransitionService` as needed:

```typescript
@Injectable()
export class PostService {
  constructor(
    private stateTransition: StateTransitionService
  ) {}
}
```
