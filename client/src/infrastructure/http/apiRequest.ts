import type { ApiErrorPayload } from '@maxcanva/shared';

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly requestId?: string,
  ) {
    super(message);
  }
}

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  json?: unknown;
  allowStatus?: number;
  networkErrorMessage?: string;
  fallbackErrorMessage?: string;
}

export function apiRequest<T>(
  path: string,
  options: ApiRequestOptions & { allowStatus: number },
): Promise<T | null>;
export function apiRequest<T>(
  path: string,
  options?: ApiRequestOptions,
): Promise<T>;
export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T | null> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? (options.json === undefined ? 'GET' : 'POST'),
      credentials: 'include',
      headers:
        options.json === undefined
          ? undefined
          : { 'Content-Type': 'application/json' },
      body:
        options.json === undefined ? undefined : JSON.stringify(options.json),
    });
  } catch {
    throw new ApiRequestError(
      options.networkErrorMessage ?? 'Impossible de joindre le serveur.',
      'NETWORK_ERROR',
    );
  }

  if (response.status === options.allowStatus) return null;
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | ApiErrorPayload
      | null;
    throw new ApiRequestError(
      payload?.error.message ??
        options.fallbackErrorMessage ??
        'Une erreur est survenue.',
      payload?.error.code ?? 'UNKNOWN_ERROR',
      payload?.error.requestId,
    );
  }

  if (response.status === 204) return null;
  return response.json() as Promise<T>;
}
