import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { AuthSession } from '@maxcanva/shared';
import {
  getAuthFeedback,
  validateAuthFields,
  type AuthFeedback,
  type AuthFieldErrors,
  type AuthMode,
} from '@/features/auth/authFeedback';
import { AuthErrorMessage } from '@/features/auth/components/AuthErrorMessage';
import { AuthRequestError, authGateway } from '@/infrastructure/auth/httpAuthGateway';

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (session: AuthSession) => void;
}

export function AuthDialog({ open, onClose, onAuthenticated }: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [feedback, setFeedback] = useState<AuthFeedback | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const titleId = useId();
  const emailErrorId = useId();
  const passwordErrorId = useId();
  const confirmPasswordErrorId = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  useEffect(() => {
    if (!open) return;
    setFeedback(null);
    setFieldErrors({});
    window.setTimeout(() => emailRef.current?.focus(), 0);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submittingRef.current) onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setFeedback(null);
    setFieldErrors({});
    setPassword('');
    setConfirmPassword('');
  };

  const clearErrorFor = (field: keyof AuthFieldErrors) => {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFeedback(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFeedback(null);

    const validationErrors = validateAuthFields(
      mode,
      email,
      password,
      confirmPassword,
    );
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      if (validationErrors.email) emailRef.current?.focus();
      else if (validationErrors.password) passwordRef.current?.focus();
      else confirmPasswordRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const session = mode === 'login'
        ? await authGateway.signIn({ email: email.trim(), password })
        : await authGateway.signUp({ email: email.trim(), password });
      onAuthenticated(session);
      setPassword('');
      setConfirmPassword('');
      onClose();
    } catch (caught) {
      if (caught instanceof AuthRequestError) {
        const nextFeedback = getAuthFeedback(caught, mode);
        setFeedback(nextFeedback);
        if (caught.code === 'INVALID_CREDENTIALS') {
          passwordRef.current?.focus();
        }
      } else {
        setFeedback({
          title:
            mode === 'register'
              ? 'Création du compte impossible'
              : 'Connexion impossible',
          message:
            'Le service est momentanément indisponible. Patientez un instant puis réessayez.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !submitting) onClose();
    }}>
      <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button className="auth-close-button" type="button" aria-label="Fermer" disabled={submitting} onClick={onClose}>×</button>
        <div className="auth-brand">
          <span className="auth-brand-mark" aria-hidden="true">M</span>
          <span>MaxCanva</span>
        </div>
        <div className="auth-doodle" aria-hidden="true">✦</div>
        <h2 id={titleId}>{mode === 'login' ? 'Se connecter' : 'Créer un compte'}</h2>
        <p className="auth-intro">
          {mode === 'login'
            ? 'Retrouvez vos prototypes et continuez à dessiner.'
            : 'Sauvegardez vos prototypes et retrouvez-les plus tard.'}
        </p>

        <form className="auth-form" onSubmit={submit} noValidate>
          <label>
            <span>Adresse courriel</span>
            <input
              ref={emailRef}
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? emailErrorId : undefined}
              onChange={(event) => {
                setEmail(event.target.value);
                clearErrorFor('email');
              }}
              placeholder="vous@exemple.com"
            />
            {fieldErrors.email && (
              <small className="auth-field-error" id={emailErrorId}>
                {fieldErrors.email}
              </small>
            )}
          </label>
          <label>
            <span>Mot de passe</span>
            <input
              ref={passwordRef}
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={8}
              maxLength={72}
              value={password}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? passwordErrorId : undefined}
              onChange={(event) => {
                setPassword(event.target.value);
                clearErrorFor('password');
              }}
              placeholder="8 caractères minimum"
            />
            {fieldErrors.password && (
              <small className="auth-field-error" id={passwordErrorId}>
                {fieldErrors.password}
              </small>
            )}
          </label>
          {mode === 'register' && (
            <label>
              <span>Confirmer le mot de passe</span>
              <input
                ref={confirmPasswordRef}
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
                value={confirmPassword}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={
                  fieldErrors.confirmPassword
                    ? confirmPasswordErrorId
                    : undefined
                }
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  clearErrorFor('confirmPassword');
                }}
                placeholder="Répétez votre mot de passe"
              />
              {fieldErrors.confirmPassword && (
                <small className="auth-field-error" id={confirmPasswordErrorId}>
                  {fieldErrors.confirmPassword}
                </small>
              )}
            </label>
          )}

          {feedback && (
            <AuthErrorMessage
              feedback={feedback}
              mode={mode}
              onSwitchMode={switchMode}
            />
          )}

          <button className="auth-submit-button" type="submit" disabled={submitting}>
            {submitting ? 'Veuillez patienter…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>
        <div className="auth-switch">
          <span>{mode === 'login' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}</span>
          <button type="button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'S’inscrire' : 'Se connecter'}
          </button>
        </div>
      </section>
    </div>
  );
}
