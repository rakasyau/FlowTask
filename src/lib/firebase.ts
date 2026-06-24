import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore with specific database ID if available
const dbId = (firebaseConfig as any).firestoreDatabaseId;
export const db = dbId && dbId !== '(default)' ? getFirestore(app, dbId) : getFirestore(app);

// Configure Google OAuth Provider with Calendar scopes
export const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar.events');

// Check sessionStorage for cached access token to persist across refreshes
let cachedAccessToken: string | null = null;
try {
  cachedAccessToken = sessionStorage.getItem('google_calendar_access_token');
} catch (e) {
  console.warn('sessionStorage is not accessible:', e);
}
let isSigningIn = false;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // User is authenticated. Pass along whatever token we have (may be null if
      // the page was refreshed and sessionStorage was cleared — in that case the
      // user is still logged in but will need to re-authenticate to get a fresh
      // Calendar access token).
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      try {
        sessionStorage.removeItem('google_calendar_access_token');
      } catch (e) {
        console.warn('Failed to clear sessionStorage:', e);
      }
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in function (triggered by button click)
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan access token dari Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    try {
      sessionStorage.setItem('google_calendar_access_token', cachedAccessToken);
    } catch (e) {
      console.warn('Failed to save token to sessionStorage:', e);
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Accessor for the cached token
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

// Log out function
export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  try {
    sessionStorage.removeItem('google_calendar_access_token');
  } catch (e) {
    console.warn('Failed to remove token from sessionStorage:', e);
  }
};
