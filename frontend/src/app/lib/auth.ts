export const TOKEN_KEY = 'flow_auth_token';

export type AuthUser = {
  id: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
};

export function getToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
}