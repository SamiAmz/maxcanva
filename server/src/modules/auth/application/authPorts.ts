import type {
  AuthenticatedUser,
  SignUpInput,
} from '@maxcanva/shared';

export interface UserRecord extends AuthenticatedUser {
  passwordHash: string;
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  create(
    input: Omit<SignUpInput, 'password'> & { passwordHash: string },
  ): Promise<UserRecord>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

export interface SessionRecord {
  id: string;
  userId: string;
  expiresAt: string;
}

export interface SessionRepository {
  create(userId: string): Promise<SessionRecord>;
  find(sessionId: string): Promise<SessionRecord | null>;
  revoke(sessionId: string): Promise<void>;
}
