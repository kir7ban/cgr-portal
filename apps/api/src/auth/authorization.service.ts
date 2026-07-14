import { Injectable, ForbiddenException } from '@nestjs/common';
import { MOCK_USERS, MockUser } from './users.mock';

type UserRole = 'EMPLOYEE' | 'COMMS_OFFICER' | 'ADMIN';

/**
 * AuthorizationService - Centralized Role-Based Access Control (RBAC)
 *
 * **Purpose:**
 * - Centralize all role-checking logic across the application
 * - Replace hardcoded role validation in services
 * - Provide consistent authorization behavior
 * - Single source of truth for RBAC
 *
 * **Core Methods:**
 * - enforceRole(): Throws ForbiddenException if user lacks required role
 * - getRoleForUser(): Returns user's role
 * - isAdmin(): Check if user is ADMIN
 * - isCommsOfficer(): Check if user is COMMS_OFFICER
 * - hasRole(): Check if user has specific role
 *
 * **Migration Path:**
 * - Services should inject AuthorizationService
 * - Replace local role checks with centralized methods
 * - Remove duplicate validation logic
 *
 * @example
 * ```typescript
 * // Before (hardcoded):
 * if (!userId.includes('admin')) {
 *   throw new ForbiddenException('Only Admins allowed');
 * }
 *
 * // After (centralized):
 * this.authorizationService.enforceRole(userId, 'ADMIN', 'Only Admins allowed');
 * ```
 */
@Injectable()
export class AuthorizationService {
  /**
   * Enforce that a user has the required role, throw exception if not.
   *
   * **Usage:**
   * - Call at the beginning of protected methods
   * - Throws ForbiddenException with custom message if user lacks role
   * - Does nothing (silent pass) if user has required role
   *
   * @param userId - Username to check
   * @param requiredRole - Role required ('ADMIN', 'COMMS_OFFICER', 'EMPLOYEE')
   * @param message - Optional custom error message
   * @throws ForbiddenException if user doesn't have required role
   *
   * @example
   * ```typescript
   * async approvePost(submissionId: string, userId: string) {
   *   this.authorizationService.enforceRole(userId, 'ADMIN', 'Only Admins can approve posts');
   *   // ... rest of approval logic
   * }
   * ```
   */
  enforceRole(userId: string, requiredRole: UserRole, message?: string): void {
    const userRole = this.getRoleForUser(userId);

    if (userRole !== requiredRole) {
      const defaultMessage = `Insufficient permissions. Required role: ${requiredRole}`;
      throw new ForbiddenException(message || defaultMessage);
    }
  }

  /**
   * Get the role for a given user.
   *
   * **Returns:**
   * - User's role if found in MOCK_USERS
   * - undefined if user not found
   *
   * @param userId - Username to lookup
   * @returns User's role or undefined
   *
   * @example
   * ```typescript
   * const role = this.authorizationService.getRoleForUser('bob.admin');
   * console.log(role); // 'ADMIN'
   * ```
   */
  getRoleForUser(userId: string): UserRole | undefined {
    const user = MOCK_USERS[userId];
    return user?.role;
  }

  /**
   * Check if a user is an Admin.
   *
   * @param userId - Username to check
   * @returns true if user has ADMIN role, false otherwise
   *
   * @example
   * ```typescript
   * if (this.authorizationService.isAdmin(userId)) {
   *   // Allow admin-only operation
   * }
   * ```
   */
  isAdmin(userId: string): boolean {
    return this.getRoleForUser(userId) === 'ADMIN';
  }

  /**
   * Check if a user is a Communications Officer.
   *
   * @param userId - Username to check
   * @returns true if user has COMMS_OFFICER role, false otherwise
   *
   * @example
   * ```typescript
   * if (this.authorizationService.isCommsOfficer(userId)) {
   *   // Allow post creation
   * }
   * ```
   */
  isCommsOfficer(userId: string): boolean {
    return this.getRoleForUser(userId) === 'COMMS_OFFICER';
  }

  /**
   * Check if a user has a specific role.
   *
   * @param userId - Username to check
   * @param role - Role to check for
   * @returns true if user has the specified role, false otherwise
   *
   * @example
   * ```typescript
   * if (this.authorizationService.hasRole(userId, 'ADMIN')) {
   *   // User is admin
   * }
   * ```
   */
  hasRole(userId: string, role: UserRole): boolean {
    return this.getRoleForUser(userId) === role;
  }
}
