import { ForbiddenException } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { MOCK_USERS } from './users.mock';

describe('AuthorizationService', () => {
  let service: AuthorizationService;

  beforeEach(() => {
    service = new AuthorizationService();
  });

  describe('enforceRole()', () => {
    it('should throw ForbiddenException for non-admin user', () => {
      // Test 1 (RED): enforceRole() throws ForbiddenException for non-admin
      expect(() => {
        service.enforceRole('john.doe', 'ADMIN');
      }).toThrow(ForbiddenException);

      expect(() => {
        service.enforceRole('alice.smith', 'ADMIN');
      }).toThrow(ForbiddenException);
    });

    it('should pass for admin user when ADMIN role required', () => {
      // Test 2 (RED): enforceRole() passes for admin
      expect(() => {
        service.enforceRole('bob.admin', 'ADMIN');
      }).not.toThrow();
    });

    it('should pass for comms officer when COMMS_OFFICER role required', () => {
      expect(() => {
        service.enforceRole('alice.smith', 'COMMS_OFFICER');
      }).not.toThrow();
    });

    it('should throw ForbiddenException with custom message', () => {
      expect(() => {
        service.enforceRole('john.doe', 'ADMIN', 'Only Admins can perform this action');
      }).toThrow('Only Admins can perform this action');
    });

    it('should throw for unknown user', () => {
      expect(() => {
        service.enforceRole('unknown.user', 'ADMIN');
      }).toThrow(ForbiddenException);
    });
  });

  describe('getRoleForUser()', () => {
    it('should return user role for known user', () => {
      // Test 3 (RED): getRoleForUser() returns user's role
      expect(service.getRoleForUser('bob.admin')).toBe('ADMIN');
      expect(service.getRoleForUser('alice.smith')).toBe('COMMS_OFFICER');
      expect(service.getRoleForUser('john.doe')).toBe('EMPLOYEE');
    });

    it('should return undefined for unknown user', () => {
      expect(service.getRoleForUser('unknown.user')).toBeUndefined();
    });
  });

  describe('isAdmin()', () => {
    it('should return true for admin users', () => {
      expect(service.isAdmin('bob.admin')).toBe(true);
    });

    it('should return false for non-admin users', () => {
      expect(service.isAdmin('john.doe')).toBe(false);
      expect(service.isAdmin('alice.smith')).toBe(false);
    });

    it('should return false for unknown users', () => {
      expect(service.isAdmin('unknown.user')).toBe(false);
    });
  });

  describe('isCommsOfficer()', () => {
    it('should return true for comms officer users', () => {
      expect(service.isCommsOfficer('alice.smith')).toBe(true);
    });

    it('should return false for non-comms users', () => {
      expect(service.isCommsOfficer('john.doe')).toBe(false);
      expect(service.isCommsOfficer('bob.admin')).toBe(false);
    });
  });

  describe('hasRole()', () => {
    it('should return true when user has exact role', () => {
      expect(service.hasRole('bob.admin', 'ADMIN')).toBe(true);
      expect(service.hasRole('alice.smith', 'COMMS_OFFICER')).toBe(true);
      expect(service.hasRole('john.doe', 'EMPLOYEE')).toBe(true);
    });

    it('should return false when user does not have role', () => {
      expect(service.hasRole('john.doe', 'ADMIN')).toBe(false);
      expect(service.hasRole('bob.admin', 'COMMS_OFFICER')).toBe(false);
    });

    it('should return false for unknown users', () => {
      expect(service.hasRole('unknown.user', 'ADMIN')).toBe(false);
    });
  });
});
