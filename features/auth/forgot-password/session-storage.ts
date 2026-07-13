const RECOVERY_EMAIL_KEY = "autowash:password-recovery:email";
const RECOVERY_TOKEN_KEY = "autowash:password-recovery:token";

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function beginPasswordRecovery(email: string): boolean {
  const storage = getSessionStorage();
  if (!storage) return false;

  try {
    storage.setItem(RECOVERY_EMAIL_KEY, email.trim());
    storage.removeItem(RECOVERY_TOKEN_KEY);
    return true;
  } catch {
    return false;
  }
}

export function getRecoveryEmail(): string | null {
  try {
    return getSessionStorage()?.getItem(RECOVERY_EMAIL_KEY) ?? null;
  } catch {
    return null;
  }
}

export function setRecoveryToken(token: string): boolean {
  const storage = getSessionStorage();
  if (!storage) return false;

  try {
    storage.setItem(RECOVERY_TOKEN_KEY, token);
    return true;
  } catch {
    return false;
  }
}

export function getRecoveryToken(): string | null {
  try {
    return getSessionStorage()?.getItem(RECOVERY_TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

export function clearPasswordRecovery(): void {
  const storage = getSessionStorage();
  if (!storage) return;

  try {
    storage.removeItem(RECOVERY_EMAIL_KEY);
    storage.removeItem(RECOVERY_TOKEN_KEY);
  } catch {
    // Storage cleanup is best-effort when the browser blocks sessionStorage.
  }
}
