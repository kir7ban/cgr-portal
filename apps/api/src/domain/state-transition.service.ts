import { Injectable, BadRequestException } from '@nestjs/common';
import { PostState, POST_STATES } from './state-types';

/**
 * Service responsible for managing and validating post state transitions.
 *
 * Valid State Transitions:
 * - DRAFT -> SUBMITTED, ARCHIVED
 * - SUBMITTED -> DRAFT, PUBLISHED, REJECTED
 * - PUBLISHED -> REVOKED, ARCHIVED
 * - REJECTED -> DRAFT, ARCHIVED
 * - REVOKED -> ARCHIVED
 * - ARCHIVED -> (terminal state, no transitions allowed)
 *
 * All states can transition to themselves (idempotent operations).
 */
@Injectable()
export class StateTransitionService {
  private readonly transitions: Map<PostState, PostState[]> = new Map([
    [POST_STATES.DRAFT, [POST_STATES.DRAFT, POST_STATES.SUBMITTED, POST_STATES.ARCHIVED]],
    [
      POST_STATES.SUBMITTED,
      [POST_STATES.SUBMITTED, POST_STATES.DRAFT, POST_STATES.PUBLISHED, POST_STATES.REJECTED],
    ],
    [
      POST_STATES.PUBLISHED,
      [POST_STATES.PUBLISHED, POST_STATES.REVOKED, POST_STATES.ARCHIVED],
    ],
    [POST_STATES.REJECTED, [POST_STATES.REJECTED, POST_STATES.DRAFT, POST_STATES.ARCHIVED]],
    [POST_STATES.REVOKED, [POST_STATES.REVOKED, POST_STATES.ARCHIVED]],
    [POST_STATES.ARCHIVED, [POST_STATES.ARCHIVED]],
  ]);

  /**
   * Check if a transition from one state to another is valid.
   *
   * @param from - Current state
   * @param to - Target state
   * @returns true if transition is allowed, false otherwise
   */
  canTransition(from: PostState, to: PostState): boolean {
    const validTransitions = this.transitions.get(from);
    if (!validTransitions) {
      return false;
    }
    return validTransitions.includes(to);
  }

  /**
   * Get all valid target states from a given state.
   *
   * @param from - Current state
   * @returns Array of valid target states
   */
  getValidTransitions(from: PostState): PostState[] {
    return this.transitions.get(from) || [];
  }

  /**
   * Validate a state transition and throw if invalid.
   *
   * @param from - Current state
   * @param to - Target state
   * @throws BadRequestException if transition is invalid
   */
  validateTransition(from: PostState, to: PostState): void {
    if (!this.canTransition(from, to)) {
      throw new BadRequestException(`Invalid state transition from ${from} to ${to}`);
    }
  }
}
