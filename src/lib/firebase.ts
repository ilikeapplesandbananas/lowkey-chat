import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: "lowkey-ai-18c4c.firebaseapp.com",
  projectId: "lowkey-ai-18c4c",
  storageBucket: "lowkey-ai-18c4c.firebasestorage.app",
  messagingSenderId: "547525715614",
  appId: "1:547525715614:web:dcde5b0ac2c32ce8683d8f",
  measurementId: "G-YVSPH3VYSH"
};

// Get configuration from Vite env or localStorage override or default
const getFirebaseConfig = () => {
  const localConfig = localStorage.getItem("lowkey_firebase_config");
  if (localConfig) {
    try {
      const parsed = JSON.parse(localConfig);
      if (parsed.apiKey && parsed.apiKey.trim()) return parsed;
    } catch {
      // ignore
    }
  }

  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || DEFAULT_FIREBASE_CONFIG.apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
    appId: import.meta.env.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
  };
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const isFirebaseConfigured = (): boolean => {
  const config = getFirebaseConfig();
  return Boolean(config.apiKey && config.projectId && config.apiKey !== "YOUR_FIREBASE_API_KEY");
};

export const initFirebase = () => {
  const config = getFirebaseConfig();

  if (!config.apiKey || config.apiKey === "YOUR_FIREBASE_API_KEY") {
    return { app: null, auth: null, db: null };
  }

  try {
    app = getApps().length > 0 ? getApp() : initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
    return { app, auth, db };
  } catch (error) {
    console.warn("Firebase initialization skipped or failed:", error);
    return { app: null, auth: null, db: null };
  }
};

const initialized = initFirebase();
app = initialized.app;
auth = initialized.auth;
db = initialized.db;

export { app, auth, db, googleProvider, getFirebaseConfig };
