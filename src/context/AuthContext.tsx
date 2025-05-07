'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, firebaseInitializationError, ensureFirebaseInitialized } from '@/lib/firebase/config'; // Import error status and helper
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert components

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authError: Error | null; // Expose specific auth errors
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Start as loading
  const [error, setError] = useState<Error | null>(firebaseInitializationError); // Initialize with potential init error

  useEffect(() => {
    // If there was an initialization error, stop loading and don't set up listener
    if (error) {
      console.error("Auth Provider: Initialization error detected on mount. Auth listener will not be set up.", error.message);
      setLoading(false);
      return;
    }

    // Check if Firebase services are ready *before* setting up the listener
    let servicesReady = false;
    try {
      ensureFirebaseInitialized(); // This checks app, auth, db, storage
      servicesReady = true;
    } catch (initErr: any) {
       console.error("Auth Provider: Firebase services check failed in useEffect.", initErr.message);
       setError(initErr); // Set the error state
       setLoading(false); // Stop loading
       return; // Exit effect
    }

    // Only proceed if services are confirmed ready
    if (servicesReady && auth) {
        console.log("Auth Provider: Firebase initialized and auth object exists. Setting up onAuthStateChanged listener.");
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          console.log("Auth Provider: onAuthStateChanged triggered. User:", currentUser ? currentUser.uid : "null");
          setUser(currentUser);
          setError(null); // Clear previous auth-specific errors on successful state change
          setLoading(false);
        }, (authStateError) => {
            console.error("Auth Provider: Error within onAuthStateChanged listener:", authStateError);
            setError(authStateError);
            setUser(null);
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => {
            console.log("Auth Provider: Cleaning up onAuthStateChanged listener.");
            unsubscribe();
        }
    } else {
        // This should ideally not be reached if ensureFirebaseInitialized works correctly
         const fallbackError = new Error("Auth Provider: Firebase auth service is not available after initial checks.");
         console.error(fallbackError.message);
         setError(fallbackError);
         setLoading(false);
    }

  }, [error]); // Rerun effect if the initial error state changes (though it shouldn't)


  // Render loading state
   if (loading) {
       console.log("Auth Provider: Rendering loading state (auth state pending or init in progress).");
       return (
           <div className="flex items-center justify-center min-h-screen bg-background">
               <Loader2 className="h-16 w-16 animate-spin text-primary" />
           </div>
       );
   }

  // Render error state if there was an initialization or auth subscription error
  if (error) {
        console.error("Auth Provider: Rendering error state. Error:", error.message);
        const isInitError = error === firebaseInitializationError ||
                            error.message?.includes("Firebase configuration contains placeholder") ||
                            error.message?.includes("Firebase Core Initialization Failed") ||
                            error.message?.includes("Firebase auth instance is unexpectedly null") ||
                             error.message?.includes("Firebase services are not available"); // Added check


        const title = isInitError ? "Application Configuration Error" : "Authentication Error";

        let description = isInitError
            ? `Could not initialize essential services. ${error.message}`
            : `Could not verify authentication status. Please try refreshing the page. (${error.message})`;

        if (isInitError && error.message.includes("NEXT_PUBLIC_FIREBASE_")) {
            description += ` Please ensure your .env file contains the correct NEXT_PUBLIC_FIREBASE_* variables from your Firebase project settings and restart the application.`;
        } else if (error.code === 'auth/network-request-failed') {
            description = "A network error occurred while trying to authenticate. Please check your internet connection.";
        } else if (error.code) { // For other Firebase auth errors passed here
             description = `An authentication error occurred (Code: ${error.code}). Please try again or contact support if the issue persists.`;
        }


        return (
           <div className="flex items-center justify-center min-h-screen bg-background p-4">
               <Alert variant="destructive" className="max-w-lg shadow-md">
                 <AlertTriangle className="h-5 w-5"/> {/* Added Icon */}
                 <AlertTitle>{title}</AlertTitle>
                 <AlertDescription>
                   {description}
                   <p className="text-xs mt-2">Check the browser console (Ctrl+Shift+J or Cmd+Option+J) for more technical details. Look for logs starting with 'Firebase config' or 'Auth Provider'.</p>
                 </AlertDescription>
               </Alert>
           </div>
        );
    }


  // Memoize the context value to prevent unnecessary re-renders
   const contextValue = useMemo(() => ({ user, loading, authError: error }), [user, loading, error]);

  // Render children only if loading is complete and there's no error
  console.log("Auth Provider: Loading complete, no critical errors. Rendering children. User authenticated:", !!user);
  return (
    <AuthContext.Provider value={contextValue}>
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

