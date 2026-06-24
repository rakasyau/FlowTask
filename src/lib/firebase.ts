import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// Google OAuth — request Calendar scope
export const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar.events');
provider.setCustomParameters({ prompt: 'select_account' });

// ── Token cache (sessionStorage) ──────────────────────────────────────────────
let cachedAccessToken: string | null = null;
try { cachedAccessToken = sessionStorage.getItem('google_calendar_access_token'); } catch (_) {}

export const saveToken = (token: string | null) => {
  cachedAccessToken = token;
  try {
    if (token) sessionStorage.setItem('google_calendar_access_token', token);
    else sessionStorage.removeItem('google_calendar_access_token');
  } catch (_) {}
};

export const getAccessToken = (): string | null => cachedAccessToken;

// ── Auth state listener ───────────────────────────────────────────────────────
export const initAuth = (
  onAuthSuccess: (user: User, token: string | null) => void,
  onAuthFailure: () => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      onAuthSuccess(user, cachedAccessToken);
    } else {
      saveToken(null);
      onAuthFailure();
    }
  });
};

// ── Sign-in: try popup first, fall back to redirect ──────────────────────────
export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) throw new Error('NO_TOKEN');
    saveToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (err: any) {
    // Popup blocked or not supported → fall back to redirect
    if (
      err.code === 'auth/popup-blocked' ||
      err.code === 'auth/popup-closed-by-user' ||
      err.code === 'auth/cancelled-popup-request' ||
      err.message === 'NO_TOKEN'
    ) {
      // Store flag so we know a redirect is pending
      try { sessionStorage.setItem('pending_redirect_signin', '1'); } catch (_) {}
      await signInWithRedirect(auth, provider);
      // Page will reload — code below won't run
      return { user: {} as User, accessToken: '' };
    }
    throw err;
  }
};

// ── Handle redirect result on page load ──────────────────────────────────────
// Call this once at app startup. Returns token if redirect just completed.
export const handleRedirectResult = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    const pending = sessionStorage.getItem('pending_redirect_signin');
    sessionStorage.removeItem('pending_redirect_signin');

    const result = await getRedirectResult(auth);
    if (!result) return null;

    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) return null;

    saveToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (err: any) {
    console.error('[Auth] getRedirectResult error:', err);
    return null;
  }
};

// ── Reconnect Calendar token (user already authenticated) ────────────────────
export const reconnectCalendar = async (): Promise<string> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) throw new Error('NO_TOKEN');
    saveToken(credential.accessToken);
    return credential.accessToken;
  } catch (err: any) {
    if (
      err.code === 'auth/popup-blocked' ||
      err.code === 'auth/cancelled-popup-request' ||
      err.message === 'NO_TOKEN'
    ) {
      try { sessionStorage.setItem('pending_redirect_signin', '1'); } catch (_) {}
      await signInWithRedirect(auth, provider);
      return '';
    }
    throw err;
  }
};

// ── Logout ────────────────────────────────────────────────────────────────────
export const logout = async () => {
  await auth.signOut();
  saveToken(null);
};
