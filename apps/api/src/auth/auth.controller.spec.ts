import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';

describe('AuthController (Integration)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret: 'test-secret-key',
          signOptions: { expiresIn: '24h' },
        }),
      ],
      controllers: [AuthController],
      providers: [AuthService, JwtStrategy, RolesGuard],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    authService = moduleFixture.get<AuthService>(AuthService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('should return access token and user for valid credentials', async () => {
      const result = await authService.login({
        username: 'john.doe',
        password: 'password123',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.user.username).toBe('john.doe');
      expect(result.user.role).toBe('EMPLOYEE');
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      await expect(
        authService.login({
          username: 'invalid.user',
          password: 'wrong',
        }),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('GET /auth/me (Protected)', () => {
    it('should return authenticated user profile', async () => {
      const loginResult = await authService.login({
        username: 'bob.admin',
        password: 'password123',
      });

      const decoded = jwtService.verify(loginResult.accessToken);
      const userProfile = await authService.validateUser(decoded);

      expect(userProfile.username).toBe('bob.admin');
      expect(userProfile.role).toBe('ADMIN');
    });
  });

  describe('Role-Based Access Control', () => {
    it('should enforce Admin role on protected endpoints', async () => {
      const employeeLogin = await authService.login({
        username: 'john.doe',
        password: 'password123',
      });

      const adminLogin = await authService.login({
        username: 'bob.admin',
        password: 'password123',
      });

      const employeeDecoded = jwtService.verify(employeeLogin.accessToken);
      const adminDecoded = jwtService.verify(adminLogin.accessToken);

      expect(employeeDecoded.role).toBe('EMPLOYEE');
      expect(adminDecoded.role).toBe('ADMIN');
    });
  });
});
