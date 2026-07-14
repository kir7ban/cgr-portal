import { Test, TestingModule } from '@nestjs/testing';
import { ErrorHandlingMiddleware } from './error-handling.middleware';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request, Response } from 'express';

describe('ErrorHandlingMiddleware', () => {
  let middleware: ErrorHandlingMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ErrorHandlingMiddleware],
    }).compile();

    middleware = module.get<ErrorHandlingMiddleware>(ErrorHandlingMiddleware);

    mockRequest = {
      method: 'GET',
      path: '/api/posts',
    };

    const statusMock = jest.fn().mockReturnThis();
    const jsonMock = jest.fn().mockReturnThis();

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = jest.fn();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('Error Code Standardization', () => {
    it('should return VALIDATION_ERROR for BadRequestException', () => {
      const error = new BadRequestException('Invalid input');

      middleware.use(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
        },
      });
    });

    it('should return NOT_FOUND for NotFoundException', () => {
      const error = new NotFoundException('Resource not found');

      middleware.use(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
      });
    });

    it('should return UNAUTHORIZED for UnauthorizedException', () => {
      const error = new UnauthorizedException('Invalid credentials');

      middleware.use(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        },
      });
    });

    it('should return FORBIDDEN for ForbiddenException', () => {
      const error = new ForbiddenException('Access denied');

      middleware.use(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    });

    it('should return CONFLICT for ConflictException', () => {
      const error = new ConflictException('Resource already exists');

      middleware.use(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Resource already exists',
        },
      });
    });

    it('should return INTERNAL_ERROR for InternalServerErrorException', () => {
      const error = new InternalServerErrorException('Something went wrong');

      middleware.use(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong',
        },
      });
    });
  });

  describe('Generic Error Handling', () => {
    it('should handle generic Error objects', () => {
      const error = new Error('Generic error');

      middleware.use(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Generic error',
        },
      });
    });

    it('should handle unknown error types', () => {
      const error = 'String error';

      middleware.use(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    });

    it('should handle null error', () => {
      middleware.use(null, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    });

    it('should handle undefined error', () => {
      middleware.use(undefined, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    });
  });

  describe('Response Format', () => {
    it('should always include success: false', () => {
      const error = new BadRequestException('Test');

      middleware.use(error, mockRequest as Request, mockResponse as Response, mockNext);

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.success).toBe(false);
    });

    it('should always include error.code', () => {
      const error = new BadRequestException('Test');

      middleware.use(error, mockRequest as Request, mockResponse as Response, mockNext);

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.error.code).toBeDefined();
      expect(typeof callArgs.error.code).toBe('string');
    });

    it('should always include error.message', () => {
      const error = new BadRequestException('Test');

      middleware.use(error, mockRequest as Request, mockResponse as Response, mockNext);

      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.error.message).toBeDefined();
      expect(typeof callArgs.error.message).toBe('string');
    });
  });

  describe('Edge Cases', () => {
    it('should handle HttpException with custom message object', () => {
      const error = new BadRequestException({ field: 'email', message: 'Invalid email' });

      middleware.use(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.success).toBe(false);
      expect(callArgs.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle errors with empty message', () => {
      const error = new BadRequestException('');

      middleware.use(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.error.message).toBeDefined();
    });

    it('should not call next() function', () => {
      const error = new BadRequestException('Test');

      middleware.use(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
