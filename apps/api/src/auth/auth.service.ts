import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MOCK_USERS, ROLE_PERMISSIONS } from './users.mock';

interface LoginDto {
  username: string;
  password: string;
}

interface User {
  id: string;
  username: string;
  role: 'EMPLOYEE' | 'COMMS_OFFICER' | 'ADMIN';
}

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
