
'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, firebaseInitializationError } from '@/lib/firebase/config'; // Import error status
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert components

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authError: Error | null; // Expose auth-specific errors if needed
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null); // Initialize error to null initially

  useEffect(() => {
    console.log("Auth Provider: useEffect triggered. Initial loading state: true");

    // 1. Check for Firebase initialization error from config.ts
    if (firebaseInitializationError) {
        console.error("Auth Provider: Firebase initialization previously failed. Error:", firebaseInitializationError.message);
        setError(firebaseInitializationError);
        setLoading(false); // Critical: ensure loading stops
        return; // Stop further execution if Firebase itself failed to init
    }

    // 2. Check if `auth` object is available (it should be if firebaseInitializationError is null)
    if (!auth) {
         // This case should ideally be caught by firebaseInitializationError,
         // but as a safeguard:
         const unexpectedError = new Error("Auth Provider: Firebase auth instance is unexpectedly null, despite no explicit initialization error. This points to an issue in firebase/config.ts or its import. Auth listener cannot be set up.");
         console.error(unexpectedError.message);
         setError(unexpectedError);
         setLoading(false); // Critical: ensure loading stops
         return; // Stop further execution
    }

    // 3. If Firebase initialized and `auth` object exists, set up the listener
    console.log("Auth Provider: Firebase initialized and auth object exists. Setting up onAuthStateChanged listener.");
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("Auth Provider: onAuthStateChanged callback fired. User:", currentUser ? currentUser.uid : "null");
      setUser(currentUser);
      setError(null); // Clear previous auth-specific errors on successful state change
      setLoading(false); // Auth state determined, stop loading
    }, (authStateError) => {
        // This error callback for onAuthStateChanged is for errors during the listener's operation,
        // not usually for initial setup issues unless the service becomes unavailable.
        console.error("Auth Provider: Error within onAuthStateChanged listener:", authStateError);
        setError(authStateError);
        setUser(null);
        setLoading(false); // Auth state determination failed, stop loading
    });

    // Cleanup subscription on unmount
    return () => {
        console.log("Auth Provider: Cleaning up onAuthStateChanged listener.");
        unsubscribe();
    }
  }, []); // Run only once on mount


  // Render loading state
   if (loading) {
       console.log("Auth Provider: Rendering loading state (auth state pending).");
       return (
           <div className="flex items-center justify-center min-h-screen bg-background">
               <Loader2 className="h-16 w-16 animate-spin text-primary" />
           </div>
       );
   }

  // Render error state if there was an initialization or auth subscription error
  if (error) {
        console.error("Auth Provider: Rendering error state. Error:", error.message, error);
        const isInitError = error === firebaseInitializationError || 
                            error.message.includes("Firebase configuration contains placeholder") ||
                            error.message.includes("Firebase Core Initialization Failed") ||
                            error.message.includes("Firebase auth instance is unexpectedly null");

        const title = isInitError ? "Application Configuration Error" : "Authentication Error";
        
        let description = isInitError
            ? `Could not initialize Firebase services. ${error.message}`
            : `Could not verify authentication status. Please try refreshing the page. (${error.message})`;

        if (isInitError && error.message.includes("NEXT_PUBLIC_FIREBASE_")) {
            description += ` Ensure your .env file has correct NEXT_PUBLIC_FIREBASE_* variables.`;
        } else if (error.code === 'auth/network-request-failed') {
            description = "A network error occurred while trying to authenticate. Please check your internet connection.";
        } else if (error.code) { // For other Firebase auth errors passed here
             description = `An authentication error occurred (Code: ${error.code}). Please try again.`;
        }


        return (
           <div className="flex items-center justify-center min-h-screen bg-background p-4">
               <Alert variant="destructive" className="max-w-lg">
                 <AlertTitle>{title}</AlertTitle>
                 <AlertDescription>
                   {description}
                   <p className="text-xs mt-2">If the issue persists, check the browser console for more details (look for 'Auth Provider' or 'Firebase config' logs). The application may not function correctly until this is resolved.</p>
                 </AlertDescription>
               </Alert>
           </div>
        );
    }


  // Render children only if loading is complete and there's no error
  console.log("Auth Provider: Loading complete, no critical errors. Rendering children. User authenticated:", !!user);
  return (
    <AuthContext.Provider value={{ user, loading, authError: error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

