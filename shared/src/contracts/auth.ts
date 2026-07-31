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

export interface SignUpInput extends SignInInput {
}

export interface AuthErrorPayload {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}
