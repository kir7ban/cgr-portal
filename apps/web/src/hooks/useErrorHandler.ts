import { useCallback } from 'react';
import axios, { AxiosError } from 'axios';

export interface ErrorResponse {
  code: string;
  message: string;
  statusCode?: number;
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Hook for standardized error handling
 * Maps error codes to user-friendly messages
 * Manages error toasts and axios interceptor
 *
 * @param userId - The ID of the current user
 * @returns Object with error handling methods
 */
export function useErrorHandler(userId: string) {
  /**
   * Map error code to user-friendly message
   */
  const mapErrorCode = useCallback((code: ErrorCode | string): string => {
    const errorMap: Record<string, string> = {
      VALIDATION_ERROR: 'Please check your input and try again',
      NOT_FOUND: 'The requested resource was not found',
      UNAUTHORIZED: 'You are not authenticated. Please log in.',
      FORBIDDEN: 'You do not have permission to perform this action',
      CONFLICT: 'This resource already exists or there is a conflict',
      INTERNAL_ERROR: 'An unexpected error occurred. Please try again.',
      NETWORK_ERROR: 'Connection lost. Please check your internet connection.',
      UNKNOWN_ERROR: 'An error occurred. Please try again.',
    };

    return errorMap[code] || errorMap.UNKNOWN_ERROR;
  }, []);

  /**
   * Handle HTTP errors and extract code
   */
  const handleHttpError = useCallback(
    (error: any): ErrorResponse => {
      const statusCode = error.status || error.statusCode || 500;
      const errorData = error.data?.error || {};
      const code = errorData.code || mapErrorCodeFromStatus(statusCode);
      const message =
        errorData.message || mapErrorCode(code as ErrorCode);

      return {
        code,
        message,
        statusCode,
      };
    },
    [mapErrorCode]
  );

  /**
   * Handle network errors
   */
  const handleNetworkError = useCallback(
    (error: any): ErrorResponse => {
      const code = 'NETWORK_ERROR';
      let message = mapErrorCode(code as ErrorCode);

      if (error.code === 'ECONNABORTED') {
        message = 'Connection lost. Please check your internet connection.';
      } else if (error.code === 'ERR_NETWORK') {
        message = 'Network error. Please try again.';
      }

      return {
        code,
        message,
      };
    },
    [mapErrorCode]
  );

  /**
   * Show error toast notification
   */
  const showErrorToast = useCallback((message: string, duration: number = 3000): boolean => {
    try {
      // In real implementation, would dispatch to toast context/library
      // For now, just return true
      console.error('Error:', message);
      return true;
    } catch (err) {
      console.error('Failed to show toast', err);
      return false;
    }
  }, []);

  /**
   * Setup axios error interceptor
   */
  const setupAxiosInterceptor = useCallback(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        let errorResponse: ErrorResponse;

        if (error.response) {
          // HTTP error
          errorResponse = handleHttpError({
            status: error.response.status,
            data: error.response.data,
          });
        } else if (error.request) {
          // Network error
          errorResponse = handleNetworkError(error);
        } else {
          // Other error
          errorResponse = {
            code: 'UNKNOWN_ERROR',
            message: error.message || 'An unknown error occurred',
          };
        }

        // Show toast
        showErrorToast(errorResponse.message);

        // Return enhanced error
        return Promise.reject({
          ...error,
          errorResponse,
        });
      }
    );

    return interceptor;
  }, [handleHttpError, handleNetworkError, showErrorToast]);

  return {
    mapErrorCode,
    handleHttpError,
    handleNetworkError,
    showErrorToast,
    setupAxiosInterceptor,
  };
}

/**
 * Map HTTP status code to error code
 */
function mapErrorCodeFromStatus(status: number): ErrorCode {
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'INTERNAL_ERROR';
    default:
      return 'UNKNOWN_ERROR';
  }
}
