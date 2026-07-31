import type {
  AuthErrorPayload,
  AuthSession,
  SignInInput,
  SignUpInput,
} from '@maxcanva/shared';
import type { AuthGateway } from '@/application/ports/authGateway';

export class AuthRequestError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly requestId?: string,
  ) {
    super(message);
  }
}

export class HttpAuthGateway implements AuthGateway {
  getSession(): Promise<AuthSession | null> {
    return this.request<AuthSession>('/api/auth/me', undefined, true);
  }

  signIn(input: SignInInput): Promise<AuthSession> {
    return this.request('/api/auth/login', input);
  }

  signUp(input: SignUpInput): Promise<AuthSession> {
    return this.request('/api/auth/register', input);
  }

  async signOut(): Promise<void> {
    await this.request('/api/auth/logout', {});
  }

  private request<T>(path: string, body?: unknown, allowUnauthorized?: false): Promise<T>;
  private request<T>(path: string, body: unknown, allowUnauthorized: true): Promise<T | null>;
  private async request<T>(path: string, body?: unknown, allowUnauthorized = false): Promise<T | null> {
    let response: Response;
    try {
      response = await fetch(path, {
        method: body === undefined ? 'GET' : 'POST',
        credentials: 'include',
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new AuthRequestError('Impossible de joindre le serveur. Réessayez plus tard.', 'NETWORK_ERROR');
    }

    if (allowUnauthorized && response.status === 401) return null;
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as AuthErrorPayload | null;
      throw new AuthRequestError(
        payload?.error.message ?? 'Une erreur est survenue. Réessayez plus tard.',
        payload?.error.code ?? 'UNKNOWN_ERROR',
        payload?.error.requestId,
      );
    }
    if (response.status === 204) return null;
    return response.json() as Promise<T>;
  }
}

export const authGateway = new HttpAuthGateway();
