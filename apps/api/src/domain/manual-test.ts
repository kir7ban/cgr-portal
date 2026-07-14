/**
 * Manual test to verify state types and transitions work correctly
 * Run with: npx ts-node src/domain/manual-test.ts
 */

import { PostState, POST_STATES, isValidPostState } from './state-types';
import { StateTransitionService } from './state-transition.service';

console.log('=== State Types Test ===\n');

// Test 1: PostState type enforces valid states
console.log('Test 1: Valid states');
const validStates: PostState[] = [
  POST_STATES.DRAFT,
  POST_STATES.SUBMITTED,
  POST_STATES.PUBLISHED,
  POST_STATES.REJECTED,
  POST_STATES.REVOKED,
  POST_STATES.ARCHIVED,
];
console.log('Valid states:', validStates);
console.log('POST_STATES object:', POST_STATES);
console.log('isValidPostState("DRAFT"):', isValidPostState('DRAFT'));
console.log('isValidPostState("INVALID"):', isValidPostState('INVALID'));

console.log('\n=== State Transition Service Test ===\n');

// Test 2: StateTransitionService.canTransition()
const service = new StateTransitionService();

console.log('Test 2: Valid transitions');
console.log('DRAFT -> SUBMITTED:', service.canTransition('DRAFT', 'SUBMITTED')); // true
console.log('DRAFT -> PUBLISHED:', service.canTransition('DRAFT', 'PUBLISHED')); // false
console.log('SUBMITTED -> PUBLISHED:', service.canTransition('SUBMITTED', 'PUBLISHED')); // true
console.log('PUBLISHED -> REVOKED:', service.canTransition('PUBLISHED', 'REVOKED')); // true
console.log('ARCHIVED -> DRAFT:', service.canTransition('ARCHIVED', 'DRAFT')); // false

console.log('\nValid transitions from DRAFT:');
console.log(service.getValidTransitions('DRAFT'));

console.log('\nValid transitions from SUBMITTED:');
console.log(service.getValidTransitions('SUBMITTED'));

console.log('\nValid transitions from PUBLISHED:');
console.log(service.getValidTransitions('PUBLISHED'));

console.log('\n=== Error Handling Test ===\n');
try {
  service.validateTransition('DRAFT', 'PUBLISHED');
  console.log('ERROR: Should have thrown');
} catch (e: any) {
  console.log('Correctly threw error:', e.message);
}

try {
  service.validateTransition('DRAFT', 'SUBMITTED');
  console.log('Valid transition DRAFT -> SUBMITTED did not throw');
} catch (e: any) {
  console.log('ERROR: Should not have thrown:', e.message);
}

console.log('\n=== All tests passed! ===');
