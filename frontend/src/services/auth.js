const AUTH_STORAGE_KEY = 'cod_guard_auth_user';

export function getStoredUser() {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUserToSession(user) {
  try {
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch (err) {
    console.error('Failed to save user session:', err);
  }
}

export function clearUserSession() {
  try {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear user session:', err);
  }
}
