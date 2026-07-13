export interface MockUser {
  id: string;
  password: string;
  role: 'EMPLOYEE' | 'COMMS_OFFICER' | 'ADMIN';
}

export const MOCK_USERS: Record<string, MockUser> = {
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

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  EMPLOYEE: ['view_feed', 'comment', 'react', 'share'],
  COMMS_OFFICER: [
    'view_feed',
    'create_post',
    'edit_own_posts',
    'comment',
    'react',
    'share',
  ],
  ADMIN: [
    'view_feed',
    'approve_post',
    'reject_post',
    'revoke_post',
    'view_audit_trail',
    'manage_audiences',
  ],
};
