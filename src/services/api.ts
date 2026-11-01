const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');

export const hasBackend = Boolean(BASE);

export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE) {
    throw new Error('VITE_API_URL is not set. Configure the backend URL in .env.');
  }

  const headers = new Headers(init?.headers);

  if (!headers.has('Content-Type') && init?.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `API request failed (${response.status})${detail ? `: ${detail}` : ''}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
