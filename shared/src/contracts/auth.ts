export interface AuthenticatedUser {
  id: string;
  email: string;
}

export interface AuthSession {
  user: AuthenticatedUser;
  expiresAt: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export type SignUpInput = SignInInput;
