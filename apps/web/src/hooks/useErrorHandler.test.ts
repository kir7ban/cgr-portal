import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from './useErrorHandler';

/**
 * TEST SUITE: Issue #23 - Error Handling - Standardized Responses
 * Tests verify:
 * - Error code mapping to messages
 * - Error codes: VALIDATION_ERROR, NOT_FOUND, UNAUTHORIZED, FORBIDDEN, CONFLICT, INTERNAL_ERROR
 * - Axios interceptor error catching
 * - Network error detection
 * - Toast notifications
 */

describe('useErrorHandler - Issue #23', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mapErrorCode', () => {
    it('should map VALIDATION_ERROR code to message', async () => {
      const { result } = renderHook(() => useErrorHandler(mockUserId));

      let message;
      await act(async () => {
        message = result.current.mapErrorCode('VALIDATION_ERROR');
      });

      expect(message).toBeDefined();
      expect(message.toLowerCase()).toContain('validation');
    });

    it('should map NOT_FOUND code to message', async () => {
      const { result } = renderHook(() => useErrorHandler(mockUserId));

      let message;
      await act(async () => {
        message = result.current.mapErrorCode('NOT_FOUND');
      });

      expect(message).toBeDefined();
      expect(message.toLowerCase()).toContain('not found');
    });

    it('should map UNAUTHORIZED code to message', async () => {
      const { result } = renderHook(() => useErrorHandler(mockUserId));

      let message;
      await act(async () => {
        message = result.current.mapErrorCode('UNAUTHORIZED');
      });

      expect(message).toBeDefined();
      expect(message.toLowerCase()).toContain('unauthorized');
    });

    it('should map FORBIDDEN code to message', async () => {
      const { result } = renderHook(() => useErrorHandler(mockUserId));

      let message;
      await act(async () => {
        message = result.current.mapErrorCode('FORBIDDEN');
      });

      expect(message).toBeDefined();
      expect(message.toLowerCase()).toContain('forbidden');
    });

    it('should map CONFLICT code to message', async () => {
      const { result } = renderHook(() => useErrorHandler(mockUserId));

      let message;
      await act(async () => {
        message = result.current.mapErrorCode('CONFLICT');
      });

      expect(message).toBeDefined();
      expect(message.toLowerCase()).toContain('conflict');
    });

    it('should map INTERNAL_ERROR code to message', async () => {
      const { result } = renderHook(() => useErrorHandler(mockUserId));

      let message;
      await act(async () => {
        message = result.current.mapErrorCode('INTERNAL_ERROR');
      });

      expect(message).toBeDefined();
      expect(message.toLowerCase()).toContain('error');
    });

    it('should provide default message for unknown code', async () => {
      const { result } = renderHook(() => useErrorHandler(mockUserId));

      let message;
      await act(async () => {
        message = result.current.mapErrorCode('UNKNOWN_CODE');
      });

      expect(message).toBeDefined();
    });
  });

  describe('handleHttpError', () => {
    it('should handle 400 validation error', async () => {
      const error = {
        status: 400,
        data: { error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
      };

      const { result } = renderHook(() => useErrorHandler(mockUserId));

      let handled;
      await act(async () => {
        handled = result.current.handleHttpError(error);
      });

      expect(handled.code).toBe('VALIDATION_ERROR');
    });

    it('should handle 404 not found error', async () => {
      const error = {
        status: 404,
        data: { error: { code: 'NOT_FOUND', message: 'Resource not found' } },
      };

      const { result } = renderHook(() => useErrorHandler(mockUserId));

      let handled;
      await act(async () => {
        handled = result.current.handleHttpError(error);
      });

      expect(handled.code).toBe('NOT_FOUND');
    });

    it('should handle 401 unauthorized error', async () => {
      const error = {
        status: 401,
        data: { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      };

      const { result } = renderHook(() => useErrorHandler(mockUserId));

      let handled;
      await act(async () => {
        handled = result.current.handleHttpError(error);
      });

      expect(handled.code).toBe('UNAUTHORIZED');
    });

    it('should handle 403 forbidden error', async () => {
      const error = {
        status: 403,
        data: { error: { code: 'FORBIDDEN', message: 'Access denied' } },
      };

      const { result } = renderHook(() => useErrorHandler(mockUserId));

      let handled;
      await act(async () => {
        handled = result.current.handleHttpError(error);
      });

      expect(handled.code).toBe('FORBIDDEN');
    });

    it('should handle 409 conflict error', async () => {
      const error = {
        status: 409,
        data: { error: { code: 'CONFLICT', message: 'Resource already exists' } },
      };

      const { result } = renderHook(() => useErrorHandler(mockUserId));

      let handled;
      await act(async () => {
        handled = result.current.handleHttpError(error);
      });

      expect(handled.code).toBe('CONFLICT');
    });

    it('should handle 500 internal error', async () => {
      const error = {
        status: 500,
        data: { error: { code: 'INTERNAL_ERROR', message: 'Server error' } },
      };

      const { result } = renderHook(() => useErrorHandler(mockUserId));

      let handled;
      await act(async () => {
        handled = result.current.handleHttpError(error);
      });

      expect(handled.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('handleNetworkError', () => {
    it('should detect network connection loss', async () => {
      const error = {
        code: 'ECONNABORTED',
        message: 'Connection lost',
      };

      const { result } = renderHook(() => useErrorHandler(mockUserId));

      let handled;
      await act(async () => {
        handled = result.current.handleNetworkError(error);
      });

      expect(handled.message).toContain('Connection lost');
    });

    it('should handle timeout error', async () => {
      const error = {
        code: 'ECONNABORTED',
        message: 'Request timeout',
      };

      const { result } = renderHook(() => useErrorHandler(mockUserId));

      let handled;
      await act(async () => {
        handled = result.current.handleNetworkError(error);
      });

      expect(handled).toBeDefined();
    });

    it('should handle no internet error', async () => {
      const error = {
        code: 'ERR_NETWORK',
        message: 'Network error',
      };

      const { result } = renderHook(() => useErrorHandler(mockUserId));

      let handled;
      await act(async () => {
        handled = result.current.handleNetworkError(error);
      });

      expect(handled).toBeDefined();
    });
  });

  describe('showErrorToast', () => {
    it('should show error toast notification', async () => {
      const { result } = renderHook(() => useErrorHandler(mockUserId));

      let toastShown = false;
      await act(async () => {
        toastShown = result.current.showErrorToast('Test error message');
      });

      expect(toastShown).toBe(true);
    });

    it('should support custom toast duration', async () => {
      const { result } = renderHook(() => useErrorHandler(mockUserId));

      let toastShown = false;
      await act(async () => {
        toastShown = result.current.showErrorToast('Error', 5000);
      });

      expect(toastShown).toBe(true);
    });
  });

  describe('setupAxiosInterceptor', () => {
    it('should setup error interceptor', async () => {
      const { result } = renderHook(() => useErrorHandler(mockUserId));

      let interceptorSetup;
      await act(async () => {
        interceptorSetup = result.current.setupAxiosInterceptor();
      });

      expect(interceptorSetup).toBeDefined();
    });

    it('should catch all errors through interceptor', async () => {
      const { result } = renderHook(() => useErrorHandler(mockUserId));

      let setup;
      await act(async () => {
        setup = result.current.setupAxiosInterceptor();
      });

      expect(setup).toBeDefined();
    });
  });
});
