import type { AuthSession, SignInInput, SignUpInput } from '@maxcanva/shared';
import type { AuthGateway } from '@/application/ports/authGateway';
import { apiRequest } from '@/infrastructure/http/apiRequest';

export { ApiRequestError as AuthRequestError } from '@/infrastructure/http/apiRequest';

class HttpAuthGateway implements AuthGateway {
  getSession(): Promise<AuthSession | null> {
    return apiRequest<AuthSession>('/api/auth/me', { allowStatus: 401 });
  }

  signIn(input: SignInInput): Promise<AuthSession> {
    return apiRequest('/api/auth/login', {
      method: 'POST',
      json: input,
      networkErrorMessage: 'Impossible de joindre le serveur. Réessayez plus tard.',
      fallbackErrorMessage: 'Une erreur est survenue. Réessayez plus tard.',
    });
  }

  signUp(input: SignUpInput): Promise<AuthSession> {
    return apiRequest('/api/auth/register', {
      method: 'POST',
      json: input,
      networkErrorMessage: 'Impossible de joindre le serveur. Réessayez plus tard.',
      fallbackErrorMessage: 'Une erreur est survenue. Réessayez plus tard.',
    });
  }

  async signOut(): Promise<void> {
    await apiRequest('/api/auth/logout', { method: 'POST', json: {} });
  }
}

export const authGateway = new HttpAuthGateway();
