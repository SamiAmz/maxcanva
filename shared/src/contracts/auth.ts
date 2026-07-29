export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthSession {
  user: AuthenticatedUser;
  expiresAt: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput extends SignInInput {
  displayName: string;
}
