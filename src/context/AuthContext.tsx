
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
  const [authError, setAuthError] = useState<Error | null>(null); // Store auth errors

  useEffect(() => {
    // If Firebase itself failed to initialize, don't attempt to use auth
    // Also set the authError state to reflect this permanent failure.
    if (firebaseInitializationError) {
        console.error("Skipping Auth setup due to Firebase initialization error:", firebaseInitializationError);
        setAuthError(firebaseInitializationError); // Set the specific error
        setLoading(false);
        return;
    }

    // If firebaseInitializationError is null, but auth is still null, it's an unexpected state
    if (!auth) {
         console.error("Firebase auth instance is null, but no initialization error was recorded.");
         const unexpectedError = new Error("Firebase auth instance is unexpectedly null.");
         setAuthError(unexpectedError);
         setLoading(false);
         return;
    }

    // Only subscribe if Firebase initialized correctly and auth exists
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      setAuthError(null); // Clear previous auth errors on successful state change
    }, (error) => {
        // Handle errors during auth state listening
        console.error("Firebase Auth state change error:", error);
        setAuthError(error);
        setUser(null);
        setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []); // Run only once on mount


  if (loading) {
     // Show a loading indicator while checking auth state OR if init failed and we are waiting
     return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
     )
  }

  // Render error state if there was an initialization or auth subscription error
  if (authError) {
        const isInitError = authError === firebaseInitializationError;
        const title = isInitError ? "Application Configuration Error" : "Authentication Error";
        const description = isInitError
            ? `Could not initialize Firebase. ${authError.message}`
            : `Could not verify authentication status. Please try refreshing the page. (${authError.message})`;

        return (
           <div className="flex items-center justify-center min-h-screen bg-background p-4">
               <Alert variant="destructive" className="max-w-md">
                 <AlertTitle>{title}</AlertTitle>
                 <AlertDescription>
                   {description}
                   {isInitError && (
                       <p className="text-xs mt-2">Ensure your <code className="bg-muted px-1 py-0.5 rounded">.env</code> file has the correct <code className="bg-muted px-1 py-0.5 rounded">NEXT_PUBLIC_FIREBASE_*</code> values.</p>
                   )}
                 </AlertDescription>
               </Alert>
           </div>
        );
    }


  return (
    <AuthContext.Provider value={{ user, loading, authError }}>
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
