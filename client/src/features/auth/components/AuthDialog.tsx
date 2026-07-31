import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { AuthSession } from '@maxcanva/shared';
import { AuthRequestError, authGateway } from '@/infrastructure/auth/httpAuthGateway';

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (session: AuthSession) => void;
}

type AuthMode = 'login' | 'register';

export function AuthDialog({ open, onClose, onAuthenticated }: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const titleId = useId();
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setRequestId(null);
    window.setTimeout(() => emailRef.current?.focus(), 0);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, open, submitting]);

  if (!open) return null;

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setRequestId(null);
    setPassword('');
    setConfirmPassword('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setRequestId(null);

    if (mode === 'register' && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSubmitting(true);
    try {
      const session = mode === 'login'
        ? await authGateway.signIn({ email, password })
        : await authGateway.signUp({ email, password });
      onAuthenticated(session);
      setPassword('');
      setConfirmPassword('');
      onClose();
    } catch (caught) {
      if (caught instanceof AuthRequestError) {
        setError(caught.message);
        setRequestId(caught.requestId ?? null);
      } else {
        setError('Une erreur inattendue est survenue.');
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

        <form className="auth-form" onSubmit={submit}>
          <label>
            <span>Adresse courriel</span>
            <input ref={emailRef} type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vous@exemple.com" />
          </label>
          <label>
            <span>Mot de passe</span>
            <input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={8} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8 caractères minimum" />
          </label>
          {mode === 'register' && (
            <label>
              <span>Confirmer le mot de passe</span>
              <input type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Répétez votre mot de passe" />
            </label>
          )}

          {error && (
            <div className="auth-error" role="alert">
              <strong>Impossible de continuer</strong>
              <span>{error}</span>
              {requestId && <small>Référence : {requestId}</small>}
            </div>
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
