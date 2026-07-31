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

export class UserEmailAlreadyExistsError extends Error {
  constructor() {
    super('A user with this email already exists');
  }
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}
