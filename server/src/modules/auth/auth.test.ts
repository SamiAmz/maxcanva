import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthService, AuthServiceError } from './application/authService';
import type { UserRecord, UserRepository } from './application/authPorts';
import { BcryptPasswordHasher } from './infrastructure/bcryptPasswordHasher';
import { JwtService } from './infrastructure/jwtService';

class InMemoryUserRepository implements UserRepository {
  readonly users = new Map<string, UserRecord>();

  async findByEmail(email: string) {
    return this.users.get(email) ?? null;
  }

  async create(input: { email: string; passwordHash: string }) {
    const user = {
      id: crypto.randomUUID(),
      email: input.email,
      passwordHash: input.passwordHash,
    };
    this.users.set(user.email, user);
    return user;
  }
}

test('inscription bcrypt, connexion et JWT', async () => {
  const repository = new InMemoryUserRepository();
  const auth = new AuthService(repository, new BcryptPasswordHasher(4));
  const password = 'mot-de-passe-solide';
  const user = await auth.signUp({ email: '  Test@Example.com ', password });

  assert.equal(user.email, 'test@example.com');
  assert.deepEqual(Object.keys(user).sort(), ['email', 'id']);

  const stored = await repository.findByEmail(user.email);
  assert.ok(stored);
  assert.notEqual(stored.passwordHash, password);
  assert.match(stored.passwordHash, /^\$2[aby]\$/);

  const authenticated = await auth.signIn({ email: user.email, password });
  assert.equal(authenticated.id, user.id);

  await assert.rejects(
    auth.signIn({ email: user.email, password: 'mauvais-mot-de-passe' }),
    (error) => error instanceof AuthServiceError && error.code === 'INVALID_CREDENTIALS',
  );

  const jwt = new JwtService('test-secret');
  const token = jwt.sign(user);
  const payload = jwt.verify(token);
  assert.equal(payload.sub, user.id);
  assert.equal(payload.email, user.email);
});
