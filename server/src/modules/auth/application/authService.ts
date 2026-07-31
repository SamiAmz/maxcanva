import type { AuthenticatedUser, SignInInput, SignUpInput } from '@maxcanva/shared';
import {
  UserEmailAlreadyExistsError,
  type PasswordHasher,
  type UserRecord,
  type UserRepository,
} from './authPorts';

const DUMMY_PASSWORD_HASH = '$2b$12$v7mS35U4p61DLzjaOqCSkuFEy5ysT3edeAylLmBPjZUxAWbB1RWNq';

export class AuthServiceError extends Error {
  constructor(
    readonly code: 'EMAIL_ALREADY_EXISTS' | 'INVALID_CREDENTIALS',
    readonly status: number,
    message: string,
    readonly reason?: string,
  ) {
    super(message);
  }
}

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordHasher,
  ) {}

  async signUp(input: SignUpInput): Promise<AuthenticatedUser> {
    const email = normalizeEmail(input.email);
    if (await this.users.findByEmail(email)) {
      throw new AuthServiceError(
        'EMAIL_ALREADY_EXISTS',
        409,
        'Un compte utilise déjà cette adresse courriel.',
        'duplicate_email',
      );
    }

    const passwordHash = await this.passwords.hash(input.password);
    try {
      return toPublicUser(await this.users.create({ email, passwordHash }));
    } catch (error) {
      if (error instanceof UserEmailAlreadyExistsError) {
        throw new AuthServiceError(
          'EMAIL_ALREADY_EXISTS',
          409,
          'Un compte utilise déjà cette adresse courriel.',
          'duplicate_email_race',
        );
      }
      throw error;
    }
  }

  async signIn(input: SignInInput): Promise<AuthenticatedUser> {
    const email = normalizeEmail(input.email);
    const user = await this.users.findByEmail(email);
    // Effectue aussi bcrypt lorsqu'aucun compte n'existe afin de limiter
    // l'énumération d'utilisateurs par différence de temps de réponse.
    const valid = await this.passwords.verify(
      input.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !valid) {
      throw new AuthServiceError(
        'INVALID_CREDENTIALS',
        401,
        'Courriel ou mot de passe incorrect.',
        user ? 'password_mismatch' : 'user_not_found',
      );
    }
    return toPublicUser(user);
  }

  async findUser(email: string): Promise<AuthenticatedUser | null> {
    const user = await this.users.findByEmail(normalizeEmail(email));
    return user ? toPublicUser(user) : null;
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toPublicUser(user: UserRecord): AuthenticatedUser {
  return { id: user.id, email: user.email };
}
