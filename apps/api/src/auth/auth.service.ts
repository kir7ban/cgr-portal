import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface LoginDto {
  username: string;
  password: string;
}

interface User {
  id: string;
  username: string;
  role: 'EMPLOYEE' | 'COMMS_OFFICER' | 'ADMIN';
}

const MOCK_USERS: Record<string, { id: string; password: string; role: User['role'] }> = {
  'john.doe': {
    id: '1',
    password: 'password123',
    role: 'EMPLOYEE',
  },
  'alice.smith': {
    id: '2',
    password: 'password123',
    role: 'COMMS_OFFICER',
  },
  'bob.admin': {
    id: '3',
    password: 'password123',
    role: 'ADMIN',
  },
};

const ROLE_PERMISSIONS: Record<User['role'], string[]> = {
  EMPLOYEE: ['view_feed', 'comment', 'react', 'share'],
  COMMS_OFFICER: ['view_feed', 'create_post', 'edit_own_posts', 'comment', 'react', 'share'],
  ADMIN: [
    'view_feed',
    'approve_post',
    'reject_post',
    'revoke_post',
    'view_audit_trail',
    'manage_audiences',
  ],
};

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async login(credentials: LoginDto) {
    const user = MOCK_USERS[credentials.username];

    if (!user || user.password !== credentials.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { id: user.id, username: credentials.username, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        username: credentials.username,
        role: user.role,
      },
    };
  }

  async validateUser(user: User) {
    return user;
  }

  getRolePermissions(role: User['role']): string[] {
    return ROLE_PERMISSIONS[role] || [];
  }
}
