import type { AuthFeedback, AuthMode } from '@/features/auth/authFeedback';

interface AuthErrorMessageProps {
  feedback: AuthFeedback;
  mode: AuthMode;
  onSwitchMode: (mode: AuthMode) => void;
}

export function AuthErrorMessage({
  feedback,
  mode,
  onSwitchMode,
}: AuthErrorMessageProps) {
  const canSwitchMode =
    feedback.suggestedMode !== undefined && feedback.suggestedMode !== mode;

  return (
    <section className="auth-error" role="alert" aria-live="assertive">
      <span className="auth-error-icon" aria-hidden="true">!</span>
      <div>
        <strong>{feedback.title}</strong>
        <span>{feedback.message}</span>
        {canSwitchMode && (
          <button
            className="auth-error-action"
            type="button"
            onClick={() => onSwitchMode(feedback.suggestedMode!)}
          >
            {feedback.suggestedMode === 'login'
              ? 'Se connecter'
              : 'Créer un compte'}
          </button>
        )}
      </div>
    </section>
  );
}
