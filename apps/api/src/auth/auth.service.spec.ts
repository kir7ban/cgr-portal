import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('login', () => {
    it('should return access token for valid Employee credentials', async () => {
      const result = await service.login({
        username: 'john.doe',
        password: 'password123',
      });

      expect(result).toEqual({
        accessToken: expect.any(String),
        user: {
          id: expect.any(String),
          username: 'john.doe',
          role: 'EMPLOYEE',
        },
      });
    });

    it('should return access token for valid Comms Officer credentials', async () => {
      const result = await service.login({
        username: 'alice.smith',
        password: 'password123',
      });

      expect(result).toEqual({
        accessToken: expect.any(String),
        user: {
          id: expect.any(String),
          username: 'alice.smith',
          role: 'COMMS_OFFICER',
        },
      });
    });

    it('should return access token for valid Admin credentials', async () => {
      const result = await service.login({
        username: 'bob.admin',
        password: 'password123',
      });

      expect(result).toEqual({
        accessToken: expect.any(String),
        user: {
          id: expect.any(String),
          username: 'bob.admin',
          role: 'ADMIN',
        },
      });
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      await expect(
        service.login({
          username: 'invalid.user',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      await expect(
        service.login({
          username: 'john.doe',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('validateUser', () => {
    it('should return user for valid JWT', async () => {
      const user = { id: '1', username: 'john.doe', role: 'EMPLOYEE' };
      const result = await service.validateUser(user);

      expect(result).toEqual(user);
    });
  });

  describe('getRolePermissions', () => {
    it('should return Employee permissions', () => {
      const permissions = service.getRolePermissions('EMPLOYEE');

      expect(permissions).toContain('view_feed');
      expect(permissions).toContain('comment');
      expect(permissions).toContain('react');
      expect(permissions).not.toContain('create_post');
      expect(permissions).not.toContain('approve_post');
    });

    it('should return Comms Officer permissions', () => {
      const permissions = service.getRolePermissions('COMMS_OFFICER');

      expect(permissions).toContain('view_feed');
      expect(permissions).toContain('create_post');
      expect(permissions).toContain('edit_own_posts');
      expect(permissions).not.toContain('approve_post');
    });

    it('should return Admin permissions', () => {
      const permissions = service.getRolePermissions('ADMIN');

      expect(permissions).toContain('view_feed');
      expect(permissions).toContain('approve_post');
      expect(permissions).toContain('revoke_post');
      expect(permissions).toContain('view_audit_trail');
    });
  });
});
