import React, { createContext, useContext, useEffect, useState } from "react";
import {
  type User,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isGuest?: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isFirebaseActive: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  continueAsGuest: () => void;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST_STORAGE_KEY = "lowkey_guest_user";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseActive, setIsFirebaseActive] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const configured = isFirebaseConfigured();
    setIsFirebaseActive(configured);

    if (configured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
            photoURL: firebaseUser.photoURL,
            isGuest: false,
          });
          // Clear guest if logged in
          localStorage.removeItem(GUEST_STORAGE_KEY);
        } else {
          // Check for guest user session
          loadGuestUser();
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Offline/local mode default to guest
      loadGuestUser();
      setLoading(false);
    }
  }, []);

  const loadGuestUser = () => {
    const saved = localStorage.getItem(GUEST_STORAGE_KEY);
    if (saved) {
      try {
        setUser(JSON.parse(saved));
        return;
      } catch {
        // ignore
      }
    }
    // Create new persistent guest ID
    const guestId = "guest_" + Math.random().toString(36).substring(2, 10);
    const guestUser: AppUser = {
      uid: guestId,
      email: null,
      displayName: "Guest User",
      photoURL: null,
      isGuest: true,
    };
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestUser));
    setUser(guestUser);
  };

  const signInWithGoogle = async () => {
    if (!auth) {
      toast({
        title: "Firebase Setup Required",
        description: "Please configure your Firebase credentials in Settings to enable Google Sign-In.",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await signInWithPopup(auth, googleProvider);
      toast({
        title: "Signed In",
        description: `Welcome back, ${res.user.displayName || "friend"}!`,
      });
    } catch (error: any) {
      console.error("Google sign in error:", error);
      let desc = error.message || "Failed to sign in with Google.";
      if (error.code === "auth/configuration-not-found" || desc.includes("configuration-not-found")) {
        desc = "Google Sign-In is not enabled yet in your Firebase Console. In Firebase Console (lowkey-ai-18c4c) -> Build -> Authentication -> Sign-in method, click Google, select your email, and click Save.";
      } else if (error.code === "auth/popup-closed-by-user") {
        desc = "Sign-in window was closed before finishing.";
      }
      toast({
        title: "Sign In Error",
        description: desc,
        variant: "destructive",
      });
      throw new Error(desc);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    if (!auth) {
      toast({
        title: "Firebase Setup Required",
        description: "Please configure your Firebase credentials in Settings to enable Email Sign-In.",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      toast({
        title: "Signed In",
        description: `Welcome back, ${res.user.displayName || email}!`,
      });
    } catch (error: any) {
      console.error("Email sign in error:", error);
      toast({
        title: "Authentication Error",
        description: error.message || "Invalid email or password.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    if (!auth) {
      toast({
        title: "Firebase Setup Required",
        description: "Please configure your Firebase credentials in Settings to enable Sign-Up.",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (name && res.user) {
        await updateProfile(res.user, { displayName: name });
      }
      toast({
        title: "Account Created",
        description: "Your secure account has been created successfully!",
      });
    } catch (error: any) {
      console.error("Sign up error:", error);
      toast({
        title: "Registration Error",
        description: error.message || "Failed to create account.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const signOutUser = async () => {
    if (auth && !user?.isGuest) {
      await signOut(auth);
    }
    loadGuestUser();
    toast({
      title: "Signed Out",
      description: "You are now browsing in private guest mode.",
    });
  };

  const continueAsGuest = () => {
    loadGuestUser();
    toast({
      title: "Guest Mode",
      description: "You're chatting as a guest. All chats are saved locally on your device.",
    });
  };

  const resetPassword = async (email: string) => {
    if (!auth) {
      toast({
        title: "Firebase Setup Required",
        description: "Password reset requires configured Firebase Auth.",
        variant: "destructive",
      });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Reset Email Sent",
        description: `Check your inbox at ${email} for password reset instructions.`,
      });
    } catch (error: any) {
      toast({
        title: "Reset Failed",
        description: error.message || "Could not send reset email.",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isFirebaseActive,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOutUser,
        continueAsGuest,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
