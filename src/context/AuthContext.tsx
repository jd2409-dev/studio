
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
  // Store both initialization and auth state errors
  const [error, setError] = useState<Error | null>(firebaseInitializationError);

  useEffect(() => {
    // If Firebase already failed to initialize, we don't proceed with auth listener setup.
    if (firebaseInitializationError) {
        console.error("Auth Provider: Skipping Auth setup due to Firebase initialization error.");
        setError(firebaseInitializationError); // Ensure the error state reflects the init error
        setLoading(false);
        return;
    }

    // If firebaseInitializationError is null, but auth is still null, it's an unexpected state.
    // This might happen if config.ts didn't run correctly on the client.
    if (!auth) {
         const unexpectedError = new Error("Auth Provider: Firebase auth instance is unexpectedly null, but no specific initialization error was caught.");
         console.error(unexpectedError.message);
         setError(unexpectedError);
         setLoading(false);
         return;
    }

    // Only subscribe if Firebase initialized correctly and auth exists
    console.log("Auth Provider: Setting up Firebase Auth listener.");
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth Provider: Auth state changed, user:", user ? user.uid : null);
      setUser(user);
      setError(null); // Clear previous errors on successful state change
      setLoading(false); // Auth state determined
    }, (authStateError) => {
        // Handle errors during auth state listening specifically
        console.error("Auth Provider: Firebase Auth state change error:", authStateError);
        setError(authStateError);
        setUser(null);
        setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
        console.log("Auth Provider: Cleaning up Firebase Auth listener.");
        unsubscribe();
    }
  }, []); // Run only once on mount


  // Render loading state
   if (loading) {
       return (
           <div className="flex items-center justify-center min-h-screen bg-background">
               <Loader2 className="h-16 w-16 animate-spin text-primary" />
           </div>
       );
   }

  // Render error state if there was an initialization or auth subscription error
  if (error) {
        const isInitError = error === firebaseInitializationError;
        const title = isInitError ? "Application Configuration Error" : "Authentication Error";
        let description = isInitError
            ? `Could not initialize Firebase services. Please ensure your Firebase project configuration is correct.`
            : `Could not verify authentication status. Please try refreshing the page. (${error.message})`;

        // Provide specific guidance for config errors
        if (isInitError) {
            description += ` Check that the NEXT_PUBLIC_FIREBASE_* variables in your .env file match your Firebase project settings.`;
        }

        return (
           <div className="flex items-center justify-center min-h-screen bg-background p-4">
               <Alert variant="destructive" className="max-w-lg">
                 <AlertTitle>{title}</AlertTitle>
                 <AlertDescription>
                   {description}
                   <p className="text-xs mt-2">If the issue persists, check the browser console for more details.</p>
                 </AlertDescription>
               </Alert>
           </div>
        );
    }


  // Render children only if loading is complete and there's no error
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
