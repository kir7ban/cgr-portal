import {
  Injectable,
  NestMiddleware,
  HttpException,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
  ExceptionFilter,
  Catch,
  ArgumentsHost,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

/**
 * ErrorHandlingMiddleware: Standardize error responses across the application
 *
 * Responsibilities:
 * - Catch all exceptions
 * - Map exception types to standardized error codes
 * - Return consistent error response format
 *
 * Error Codes:
 * - VALIDATION_ERROR (400) - BadRequestException
 * - UNAUTHORIZED (401) - UnauthorizedException
 * - FORBIDDEN (403) - ForbiddenException
 * - NOT_FOUND (404) - NotFoundException
 * - CONFLICT (409) - ConflictException
 * - INTERNAL_ERROR (500) - InternalServerErrorException and generic errors
 *
 * Response Format:
 * {
 *   success: false,
 *   error: {
 *     code: "ERROR_CODE",
 *     message: "Human-readable error message"
 *   }
 * }
 */
@Catch()
export class ErrorHandlingMiddleware implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception);
    const statusCode = this.getStatusCode(exception);

    response.status(statusCode).json(errorResponse);
  }

  /**
   * Build standardized error response
   * @private
   */
  private buildErrorResponse(exception: any): ErrorResponse {
    const code = this.getErrorCode(exception);
    const message = this.getErrorMessage(exception);

    return {
      success: false,
      error: {
        code,
        message,
      },
    };
  }

  /**
   * Map exception to error code
   * @private
   */
  private getErrorCode(exception: any): string {
    if (exception instanceof BadRequestException) {
      return 'VALIDATION_ERROR';
    }

    if (exception instanceof NotFoundException) {
      return 'NOT_FOUND';
    }

    if (exception instanceof UnauthorizedException) {
      return 'UNAUTHORIZED';
    }

    if (exception instanceof ForbiddenException) {
      return 'FORBIDDEN';
    }

    if (exception instanceof ConflictException) {
      return 'CONFLICT';
    }

    if (exception instanceof InternalServerErrorException) {
      return 'INTERNAL_ERROR';
    }

    return 'INTERNAL_ERROR';
  }

  /**
   * Extract error message from exception
   * @private
   */
  private getErrorMessage(exception: any): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return response;
      }

      if (typeof response === 'object' && response !== null) {
        // Handle NestJS validation error format
        if ('message' in response) {
          if (Array.isArray(response.message)) {
            return response.message.join(', ');
          }
          if (typeof response.message === 'string') {
            return response.message;
          }
        }

        // Handle custom error objects
        return JSON.stringify(response);
      }
    }

    if (exception instanceof Error) {
      return exception.message || 'An unexpected error occurred';
    }

    return 'An unexpected error occurred';
  }

  /**
   * Get HTTP status code from exception
   * @private
   */
  private getStatusCode(exception: any): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return 500;
  }

  /**
   * Middleware implementation (for use in app.module)
   */
  use(error: any, req: Request, res: Response, next: NextFunction): void {
    const errorResponse = this.buildErrorResponse(error);
    const statusCode = this.getStatusCode(error);

    res.status(statusCode).json(errorResponse);
  }
}
