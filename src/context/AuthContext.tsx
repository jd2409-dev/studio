
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
    if (firebaseInitializationError || !auth) {
        console.error("Skipping Auth setup due to Firebase initialization error.");
        setLoading(false);
        return;
    }

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

  // Render error state if Firebase initialization failed
  if (firebaseInitializationError) {
      return (
           <div className="flex items-center justify-center min-h-screen bg-background p-4">
              <Alert variant="destructive" className="max-w-md">
                <AlertTitle>Application Error</AlertTitle>
                <AlertDescription>
                  Failed to initialize Firebase. Please check the environment configuration and console logs.
                  <br />
                  <span className="text-xs mt-2 block">({firebaseInitializationError.message})</span>
                </AlertDescription>
              </Alert>
           </div>
      );
  }

  if (loading) {
     // Show a loading indicator while checking auth state
     return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
     )
  }

  // Render error state if there was an error subscribing to auth changes
  if (authError) {
        return (
           <div className="flex items-center justify-center min-h-screen bg-background p-4">
               <Alert variant="destructive" className="max-w-md">
                 <AlertTitle>Authentication Error</AlertTitle>
                 <AlertDescription>
                   Could not verify authentication status. Please try refreshing the page.
                   <br />
                   <span className="text-xs mt-2 block">({authError.message})</span>
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

