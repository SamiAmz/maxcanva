import 'dotenv/config';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { z } from 'zod';
import type { AuthSession } from '@maxcanva/shared';
import { AuthService, AuthServiceError } from '../modules/auth/application/authService';
import { BcryptPasswordHasher } from '../modules/auth/infrastructure/bcryptPasswordHasher';
import { JwtService } from '../modules/auth/infrastructure/jwtService';
import { SupabaseUserRepository } from '../modules/auth/infrastructure/supabaseUserRepository';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });
const isProduction = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.JWT_SECRET;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!jwtSecret && isProduction) {
  throw new Error('JWT_SECRET is required in production');
}
if (!jwtSecret) {
  logger.warn({ event: 'auth.insecure_dev_secret' }, 'Using development-only JWT secret');
}
if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error(
    'SUPABASE_URL and SUPABASE_SECRET_KEY are required. See server/.env.example.',
  );
}

const jwtService = new JwtService(jwtSecret ?? 'maxcanva-development-secret-change-me');
const authService = new AuthService(
  new SupabaseUserRepository(supabaseUrl, supabaseSecretKey),
  new BcryptPasswordHasher(12),
);
const app = express();

app.use(pinoHttp({ logger, genReqId: (request) => request.headers['x-request-id']?.toString() ?? crypto.randomUUID() }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '32kb' }));

const credentialsSchema = z.object({
  email: z.string().trim().email('Adresse courriel invalide.').max(254),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.').max(72),
});

app.post('/api/auth/register', asyncRoute(async (request, response) => {
  const input = credentialsSchema.parse(request.body);
  const user = await authService.signUp(input);
  setAuthCookie(response, jwtService.sign(user));
  request.log.info({ event: 'auth.register_succeeded', userId: user.id }, 'Account created');
  response.status(201).json(toSession(user));
}));

app.post('/api/auth/login', asyncRoute(async (request, response) => {
  const input = credentialsSchema.parse(request.body);
  const user = await authService.signIn(input);
  setAuthCookie(response, jwtService.sign(user));
  request.log.info({ event: 'auth.login_succeeded', userId: user.id }, 'Login succeeded');
  response.json(toSession(user));
}));

app.post('/api/auth/logout', (_request, response) => {
  response.clearCookie('maxcanva_session', cookieOptions());
  response.status(204).end();
});

app.get('/api/auth/me', asyncRoute(async (request, response) => {
  const token = readCookie(request, 'maxcanva_session');
  if (!token) return response.status(401).json(publicError('UNAUTHENTICATED', 'Connexion requise.', String(request.id)));

  try {
    const payload = jwtService.verify(token);
    const user = await authService.findUser(payload.email);
    if (!user || user.id !== payload.sub) throw new Error('JWT user no longer exists');
    return response.json(toSession(user));
  } catch {
    response.clearCookie('maxcanva_session', cookieOptions());
    return response.status(401).json(publicError('SESSION_EXPIRED', 'Votre session a expiré.', String(request.id)));
  }
}));

app.use((error: unknown, request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError) {
    request.log.warn({ event: 'auth.validation_failed', issues: error.issues.map(({ path, code }) => ({ path, code })) }, 'Invalid auth input');
    return response.status(400).json(publicError('VALIDATION_ERROR', error.issues[0]?.message ?? 'Données invalides.', String(request.id)));
  }
  if (error instanceof AuthServiceError) {
    request.log.warn({ event: 'auth.request_failed', code: error.code, reason: error.reason }, 'Authentication request failed');
    return response.status(error.status).json(publicError(error.code, error.message, String(request.id)));
  }
  request.log.error({ event: 'auth.internal_error', err: error }, 'Unexpected authentication error');
  return response.status(500).json(publicError('INTERNAL_ERROR', 'Une erreur est survenue. Réessayez plus tard.', String(request.id)));
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => logger.info({ event: 'server.started', port }, `API listening on port ${port}`));

function asyncRoute(handler: (request: Request, response: Response) => Promise<unknown>) {
  return (request: Request, response: Response, next: NextFunction) => void handler(request, response).catch(next);
}

function setAuthCookie(response: Response, token: string) {
  response.cookie('maxcanva_session', token, { ...cookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 });
}

function cookieOptions() {
  return { httpOnly: true, secure: isProduction, sameSite: 'lax' as const, path: '/' };
}

function readCookie(request: Request, name: string) {
  const cookies = request.headers.cookie?.split(';') ?? [];
  const cookie = cookies.map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : undefined;
}

function toSession(user: AuthSession['user']): AuthSession {
  return { user, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() };
}

function publicError(code: string, message: string, requestId: string) {
  return { error: { code, message, requestId } };
}
