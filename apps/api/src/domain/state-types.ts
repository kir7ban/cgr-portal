/**
 * Valid states for a post in the system.
 *
 * State Lifecycle:
 * - DRAFT: Initial state when post is created
 * - SUBMITTED: Post submitted for approval
 * - PUBLISHED: Post approved and visible to audience
 * - REJECTED: Post rejected during approval
 * - REVOKED: Published post that has been revoked
 * - ARCHIVED: Post archived and no longer visible
 */
export type PostState =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'REVOKED'
  | 'ARCHIVED';

/**
 * Constants for all valid post states.
 * Use these instead of string literals for type safety.
 */
export const POST_STATES = {
  DRAFT: 'DRAFT' as const,
  SUBMITTED: 'SUBMITTED' as const,
  PUBLISHED: 'PUBLISHED' as const,
  REJECTED: 'REJECTED' as const,
  REVOKED: 'REVOKED' as const,
  ARCHIVED: 'ARCHIVED' as const,
} as const;

/**
 * Helper to check if a string is a valid PostState
 */
export function isValidPostState(state: string): state is PostState {
  return Object.values(POST_STATES).includes(state as PostState);
}
