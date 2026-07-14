import { PostState, POST_STATES } from './state-types';

describe('PostState Type', () => {
  describe('Test 1: PostState type enforces valid states', () => {
    it('should allow valid DRAFT state', () => {
      const state: PostState = 'DRAFT';
      expect(state).toBe('DRAFT');
    });

    it('should allow valid SUBMITTED state', () => {
      const state: PostState = 'SUBMITTED';
      expect(state).toBe('SUBMITTED');
    });

    it('should allow valid PUBLISHED state', () => {
      const state: PostState = 'PUBLISHED';
      expect(state).toBe('PUBLISHED');
    });

    it('should allow valid REJECTED state', () => {
      const state: PostState = 'REJECTED';
      expect(state).toBe('REJECTED');
    });

    it('should allow valid REVOKED state', () => {
      const state: PostState = 'REVOKED';
      expect(state).toBe('REVOKED');
    });

    it('should allow valid ARCHIVED state', () => {
      const state: PostState = 'ARCHIVED';
      expect(state).toBe('ARCHIVED');
    });

    it('should export all valid post states as constants', () => {
      expect(POST_STATES).toBeDefined();
      expect(POST_STATES.DRAFT).toBe('DRAFT');
      expect(POST_STATES.SUBMITTED).toBe('SUBMITTED');
      expect(POST_STATES.PUBLISHED).toBe('PUBLISHED');
      expect(POST_STATES.REJECTED).toBe('REJECTED');
      expect(POST_STATES.REVOKED).toBe('REVOKED');
      expect(POST_STATES.ARCHIVED).toBe('ARCHIVED');
    });

    it('should provide array of all valid states', () => {
      const allStates = Object.values(POST_STATES);
      expect(allStates).toHaveLength(6);
      expect(allStates).toContain('DRAFT');
      expect(allStates).toContain('SUBMITTED');
      expect(allStates).toContain('PUBLISHED');
      expect(allStates).toContain('REJECTED');
      expect(allStates).toContain('REVOKED');
      expect(allStates).toContain('ARCHIVED');
    });
  });
});
