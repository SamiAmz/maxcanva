import type {
  AuthSession,
  SignInInput,
  SignUpInput,
} from '@maxcanva/shared';

export interface AuthGateway {
  getSession(): Promise<AuthSession | null>;
  signIn(input: SignInInput): Promise<AuthSession>;
  signUp(input: SignUpInput): Promise<AuthSession>;
  signOut(): Promise<void>;
}
