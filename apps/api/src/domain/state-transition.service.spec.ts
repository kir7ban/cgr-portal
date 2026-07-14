import { StateTransitionService } from './state-transition.service';
import { PostState, POST_STATES } from './state-types';

describe('StateTransitionService', () => {
  let service: StateTransitionService;

  beforeEach(() => {
    service = new StateTransitionService();
  });

  describe('Test 2: canTransition() validates legal transitions', () => {
    describe('DRAFT transitions', () => {
      it('should allow DRAFT -> SUBMITTED', () => {
        expect(service.canTransition('DRAFT', 'SUBMITTED')).toBe(true);
      });

      it('should allow DRAFT -> ARCHIVED', () => {
        expect(service.canTransition('DRAFT', 'ARCHIVED')).toBe(true);
      });

      it('should not allow DRAFT -> PUBLISHED', () => {
        expect(service.canTransition('DRAFT', 'PUBLISHED')).toBe(false);
      });

      it('should not allow DRAFT -> REJECTED', () => {
        expect(service.canTransition('DRAFT', 'REJECTED')).toBe(false);
      });

      it('should not allow DRAFT -> REVOKED', () => {
        expect(service.canTransition('DRAFT', 'REVOKED')).toBe(false);
      });
    });

    describe('SUBMITTED transitions', () => {
      it('should allow SUBMITTED -> PUBLISHED', () => {
        expect(service.canTransition('SUBMITTED', 'PUBLISHED')).toBe(true);
      });

      it('should allow SUBMITTED -> REJECTED', () => {
        expect(service.canTransition('SUBMITTED', 'REJECTED')).toBe(true);
      });

      it('should allow SUBMITTED -> DRAFT (for editing)', () => {
        expect(service.canTransition('SUBMITTED', 'DRAFT')).toBe(true);
      });

      it('should not allow SUBMITTED -> REVOKED', () => {
        expect(service.canTransition('SUBMITTED', 'REVOKED')).toBe(false);
      });

      it('should not allow SUBMITTED -> ARCHIVED', () => {
        expect(service.canTransition('SUBMITTED', 'ARCHIVED')).toBe(false);
      });
    });

    describe('PUBLISHED transitions', () => {
      it('should allow PUBLISHED -> REVOKED', () => {
        expect(service.canTransition('PUBLISHED', 'REVOKED')).toBe(true);
      });

      it('should allow PUBLISHED -> ARCHIVED', () => {
        expect(service.canTransition('PUBLISHED', 'ARCHIVED')).toBe(true);
      });

      it('should not allow PUBLISHED -> DRAFT', () => {
        expect(service.canTransition('PUBLISHED', 'DRAFT')).toBe(false);
      });

      it('should not allow PUBLISHED -> SUBMITTED', () => {
        expect(service.canTransition('PUBLISHED', 'SUBMITTED')).toBe(false);
      });

      it('should not allow PUBLISHED -> REJECTED', () => {
        expect(service.canTransition('PUBLISHED', 'REJECTED')).toBe(false);
      });
    });

    describe('REJECTED transitions', () => {
      it('should allow REJECTED -> DRAFT (for re-editing)', () => {
        expect(service.canTransition('REJECTED', 'DRAFT')).toBe(true);
      });

      it('should allow REJECTED -> ARCHIVED', () => {
        expect(service.canTransition('REJECTED', 'ARCHIVED')).toBe(true);
      });

      it('should not allow REJECTED -> SUBMITTED', () => {
        expect(service.canTransition('REJECTED', 'SUBMITTED')).toBe(false);
      });

      it('should not allow REJECTED -> PUBLISHED', () => {
        expect(service.canTransition('REJECTED', 'PUBLISHED')).toBe(false);
      });

      it('should not allow REJECTED -> REVOKED', () => {
        expect(service.canTransition('REJECTED', 'REVOKED')).toBe(false);
      });
    });

    describe('REVOKED transitions', () => {
      it('should allow REVOKED -> ARCHIVED', () => {
        expect(service.canTransition('REVOKED', 'ARCHIVED')).toBe(true);
      });

      it('should not allow REVOKED -> DRAFT', () => {
        expect(service.canTransition('REVOKED', 'DRAFT')).toBe(false);
      });

      it('should not allow REVOKED -> SUBMITTED', () => {
        expect(service.canTransition('REVOKED', 'SUBMITTED')).toBe(false);
      });

      it('should not allow REVOKED -> PUBLISHED', () => {
        expect(service.canTransition('REVOKED', 'PUBLISHED')).toBe(false);
      });

      it('should not allow REVOKED -> REJECTED', () => {
        expect(service.canTransition('REVOKED', 'REJECTED')).toBe(false);
      });
    });

    describe('ARCHIVED transitions', () => {
      it('should not allow ARCHIVED -> DRAFT', () => {
        expect(service.canTransition('ARCHIVED', 'DRAFT')).toBe(false);
      });

      it('should not allow ARCHIVED -> SUBMITTED', () => {
        expect(service.canTransition('ARCHIVED', 'SUBMITTED')).toBe(false);
      });

      it('should not allow ARCHIVED -> PUBLISHED', () => {
        expect(service.canTransition('ARCHIVED', 'PUBLISHED')).toBe(false);
      });

      it('should not allow ARCHIVED -> REJECTED', () => {
        expect(service.canTransition('ARCHIVED', 'REJECTED')).toBe(false);
      });

      it('should not allow ARCHIVED -> REVOKED', () => {
        expect(service.canTransition('ARCHIVED', 'REVOKED')).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('should allow same state transition (idempotent)', () => {
        expect(service.canTransition('DRAFT', 'DRAFT')).toBe(true);
        expect(service.canTransition('SUBMITTED', 'SUBMITTED')).toBe(true);
        expect(service.canTransition('PUBLISHED', 'PUBLISHED')).toBe(true);
        expect(service.canTransition('REJECTED', 'REJECTED')).toBe(true);
        expect(service.canTransition('REVOKED', 'REVOKED')).toBe(true);
        expect(service.canTransition('ARCHIVED', 'ARCHIVED')).toBe(true);
      });
    });
  });

  describe('getValidTransitions()', () => {
    it('should return all valid transitions from DRAFT', () => {
      const validTransitions = service.getValidTransitions('DRAFT');
      expect(validTransitions).toContain('DRAFT');
      expect(validTransitions).toContain('SUBMITTED');
      expect(validTransitions).toContain('ARCHIVED');
      expect(validTransitions).not.toContain('PUBLISHED');
      expect(validTransitions).not.toContain('REJECTED');
      expect(validTransitions).not.toContain('REVOKED');
    });

    it('should return all valid transitions from SUBMITTED', () => {
      const validTransitions = service.getValidTransitions('SUBMITTED');
      expect(validTransitions).toContain('SUBMITTED');
      expect(validTransitions).toContain('DRAFT');
      expect(validTransitions).toContain('PUBLISHED');
      expect(validTransitions).toContain('REJECTED');
      expect(validTransitions).not.toContain('REVOKED');
      expect(validTransitions).not.toContain('ARCHIVED');
    });

    it('should return all valid transitions from PUBLISHED', () => {
      const validTransitions = service.getValidTransitions('PUBLISHED');
      expect(validTransitions).toContain('PUBLISHED');
      expect(validTransitions).toContain('REVOKED');
      expect(validTransitions).toContain('ARCHIVED');
      expect(validTransitions).not.toContain('DRAFT');
      expect(validTransitions).not.toContain('SUBMITTED');
      expect(validTransitions).not.toContain('REJECTED');
    });

    it('should return only ARCHIVED as valid transition from ARCHIVED', () => {
      const validTransitions = service.getValidTransitions('ARCHIVED');
      expect(validTransitions).toEqual(['ARCHIVED']);
    });
  });

  describe('validateTransition()', () => {
    it('should not throw for valid transitions', () => {
      expect(() => service.validateTransition('DRAFT', 'SUBMITTED')).not.toThrow();
      expect(() => service.validateTransition('SUBMITTED', 'PUBLISHED')).not.toThrow();
      expect(() => service.validateTransition('PUBLISHED', 'REVOKED')).not.toThrow();
    });

    it('should throw for invalid transitions', () => {
      expect(() => service.validateTransition('DRAFT', 'PUBLISHED')).toThrow(
        'Invalid state transition from DRAFT to PUBLISHED'
      );
      expect(() => service.validateTransition('SUBMITTED', 'REVOKED')).toThrow(
        'Invalid state transition from SUBMITTED to REVOKED'
      );
      expect(() => service.validateTransition('ARCHIVED', 'DRAFT')).toThrow(
        'Invalid state transition from ARCHIVED to DRAFT'
      );
    });
  });
});
