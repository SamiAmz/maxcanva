import type { AuthRequestError } from '@/infrastructure/auth/httpAuthGateway';

export type AuthMode = 'login' | 'register';

export interface AuthFeedback {
  title: string;
  message: string;
  suggestedMode?: AuthMode;
}

export interface AuthFieldErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAuthFields(
  mode: AuthMode,
  email: string,
  password: string,
  confirmPassword: string,
): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const normalizedEmail = email.trim();

  if (!normalizedEmail) {
    errors.email = 'Entrez votre adresse courriel.';
  } else if (!EMAIL_PATTERN.test(normalizedEmail)) {
    errors.email = 'Entrez une adresse courriel valide, par exemple vous@exemple.com.';
  }

  if (!password) {
    errors.password = 'Entrez votre mot de passe.';
  } else if (password.length < 8) {
    errors.password = 'Utilisez au moins 8 caractères.';
  } else if (password.length > 72) {
    errors.password = 'Utilisez au maximum 72 caractères.';
  }

  if (mode === 'register') {
    if (!confirmPassword) {
      errors.confirmPassword = 'Confirmez votre mot de passe.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Les deux mots de passe doivent être identiques.';
    }
  }

  return errors;
}

export function getAuthFeedback(
  error: AuthRequestError,
  mode: AuthMode,
): AuthFeedback {
  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return {
        title: 'Connexion impossible',
        message:
          'L’adresse courriel ou le mot de passe est incorrect. Vérifiez vos informations puis réessayez.',
      };
    case 'EMAIL_ALREADY_EXISTS':
      return {
        title: 'Cette adresse est déjà utilisée',
        message:
          'Un compte existe déjà avec cette adresse courriel. Connectez-vous pour retrouver vos projets.',
        suggestedMode: 'login',
      };
    case 'VALIDATION_ERROR':
      return {
        title: 'Vérifiez vos informations',
        message:
          mode === 'register'
            ? 'Certaines informations ne permettent pas de créer le compte. Corrigez les champs indiqués puis réessayez.'
            : 'Certaines informations semblent incorrectes. Corrigez-les puis réessayez.',
      };
    case 'NETWORK_ERROR':
      return {
        title: 'Connexion au service impossible',
        message:
          'Vérifiez votre connexion Internet, puis réessayez dans quelques instants.',
      };
    case 'TOO_MANY_REQUESTS':
      return {
        title: 'Trop de tentatives',
        message:
          'Patientez quelques minutes avant de réessayer. Cela aide à protéger votre compte.',
      };
    case 'INTERNAL_ERROR':
    case 'UNKNOWN_ERROR':
    default:
      return {
        title:
          mode === 'register'
            ? 'Création du compte impossible'
            : 'Connexion impossible',
        message:
          'Le service est momentanément indisponible. Patientez un instant puis réessayez.',
      };
  }
}
