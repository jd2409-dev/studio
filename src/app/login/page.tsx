'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, updateProfile } from 'firebase/auth';
import { auth, db, firebaseInitializationError, ensureFirebaseInitialized } from '@/lib/firebase/config'; // Import error status and helper
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { Loader2 } from 'lucide-react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import type { UserProfile } from '@/types/user'; // Import UserProfile type
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // Added state for name during signup
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false); // State for signup loading
  const [isGoogleLoading, setIsGoogleLoading] = useState(false); // State for Google Sign-in loading
  const [showSignupFields, setShowSignupFields] = useState(false); // Toggle between Login and Signup view
  const { toast } = useToast();
  const router = useRouter();
  const { user, loading } = useAuth(); // Get user and loading state

  useEffect(() => {
      // Redirect to dashboard if user is already logged in and finished loading
      if (!loading && user) {
          router.push('/');
      }
  }, [user, loading, router]);

  const createFirestoreUserProfile = async (userId: string, userEmail: string, userName: string, photoURL?: string | null) => {
       // Check Firebase initialization *before* trying to use Firestore
       ensureFirebaseInitialized();
      // No need to check db here, as ensureFirebaseInitialized covers it
      const userDocRef = doc(db!, 'users', userId); // Use non-null assertion after check
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
          const defaultProfile: UserProfile = {
              uid: userId,
              name: userName || userEmail.split('@')[0] || "New User", // Use provided name, fallback to email part or default
              email: userEmail,
              avatarUrl: photoURL || `https://avatar.vercel.sh/${userEmail}.png`, // Use photoURL or generate fallback
              schoolBoard: '',
              grade: '',
              joinDate: new Date().toISOString(), // Store join date on creation
          };
          await setDoc(userDocRef, defaultProfile);
          console.log("Created Firestore user profile for:", userId);
      } else {
         console.log("Firestore user profile already exists for:", userId);
         // Optionally update existing fields like lastLogin here if needed
      }
  };


  const handleLogin = async (e?: FormEvent) => {
    e?.preventDefault(); // Prevent default form submission if called from form
    try {
        ensureFirebaseInitialized(); // Check if Firebase is ready
        if (!email || !password) {
            toast({ title: "Error", description: "Please enter email and password.", variant: "destructive"});
            return;
        }
        setIsLoggingIn(true);
        await signInWithEmailAndPassword(auth!, email, password); // Use non-null assertion
        toast({
            title: "Login Successful",
            description: "Redirecting to dashboard.",
        });
        router.push('/'); // Redirect on successful login
    } catch (error: any) {
      console.error("Login Error:", error);
       // Check for specific Firebase auth errors
       let description = "An unexpected error occurred during login.";
       if (error.code) {
           switch (error.code) {
                case 'auth/invalid-credential':
                case 'auth/user-not-found': // Deprecated, but handle just in case
                case 'auth/wrong-password': // Deprecated, but handle just in case
                   description = "Invalid email or password. Please check your credentials.";
                   break;
                case 'auth/invalid-email':
                     description = "Please enter a valid email address.";
                     break;
               case 'auth/user-disabled':
                   description = "This account has been disabled.";
                   break;
               case 'auth/too-many-requests':
                    description = "Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.";
                    break;
                case 'auth/network-request-failed':
                    description = "Network error. Please check your internet connection and try again.";
                    break;
                case 'auth/api-key-not-valid':
                    description = "Authentication failed: Invalid API key. Please check the application configuration.";
                     console.error("Firebase API Key is invalid. Check your .env file and Firebase project settings.");
                    break;
                case 'auth/configuration-not-found':
                     description = "Authentication configuration error. Please ensure the Email/Password sign-in method is enabled in your Firebase project settings.";
                     console.error("Email/Password sign-in method not enabled in Firebase console.");
                     break;
               default:
                  // Use the error message if available, otherwise use the code
                 description = error.message || `Login failed with code: ${error.code}`;
           }
       } else if (error.message?.includes("Firebase is not initialized") || error.message?.includes("auth is null")) {
            description = "Application configuration error. Could not connect to authentication service.";
       }

      toast({
        title: "Login Failed",
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignup = async (e?: FormEvent) => {
    e?.preventDefault(); // Prevent default form submission if called from form
     try {
        ensureFirebaseInitialized(); // Check if Firebase is ready
        if (!email || !password || !name) {
            toast({ title: "Error", description: "Please enter name, email, and password.", variant: "destructive"});
            return;
        }
        setIsSigningUp(true);

        const userCredential = await createUserWithEmailAndPassword(auth!, email, password); // Use non-null assertion
        const newUser = userCredential.user;

        // Update Firebase Auth profile with name
        await updateProfile(newUser, { displayName: name });

        // Create Firestore user profile
        await createFirestoreUserProfile(newUser.uid, newUser.email!, name, newUser.photoURL);


        toast({
            title: "Signup Successful",
            description: "Account created. Redirecting to dashboard.",
        });
        // Redirect to dashboard after signup
        router.push('/');
    } catch (error: any) {
        console.error("Signup Error:", error);
         // Check for specific Firebase auth errors
        let description = "An unexpected error occurred during signup.";
        if (error.code) {
            switch (error.code) {
                case 'auth/email-already-in-use':
                    description = "This email address is already associated with an account.";
                    break;
                case 'auth/invalid-email':
                    description = "Please enter a valid email address.";
                    break;
                case 'auth/weak-password':
                    description = "Password is too weak. Please choose a stronger password (at least 6 characters).";
                    break;
                 case 'auth/network-request-failed':
                    description = "Network error. Please check your internet connection and try again.";
                    break;
                 case 'auth/api-key-not-valid':
                    description = "Authentication failed: Invalid API key. Please check the application configuration.";
                     console.error("Firebase API Key is invalid. Check your .env file and Firebase project settings.");
                    break;
                 case 'auth/configuration-not-found':
                     description = "Authentication configuration error. Please ensure the Email/Password sign-in method is enabled in your Firebase project settings.";
                     console.error("Email/Password sign-in method not enabled in Firebase console.");
                     break;
                default:
                    description = error.message || `Signup failed with code: ${error.code}`;
            }
        } else if (error.message?.includes("Firebase is not initialized") || error.message?.includes("auth is null")) {
            description = "Application configuration error. Could not connect to authentication service.";
       }

        toast({
            title: "Signup Failed",
            description: description,
            variant: "destructive",
        });
    } finally {
        setIsSigningUp(false);
    }
  };

  const handleGoogleSignIn = async () => {
     try {
        ensureFirebaseInitialized(); // Check if Firebase is ready
        setIsGoogleLoading(true);
        const provider = new GoogleAuthProvider();

        const result = await signInWithPopup(auth!, provider); // Use non-null assertion
        const googleUser = result.user;

         // Create or check Firestore user profile
        await createFirestoreUserProfile(googleUser.uid, googleUser.email!, googleUser.displayName || '', googleUser.photoURL);


        toast({
            title: "Google Sign-In Successful",
            description: "Redirecting to dashboard.",
        });
        router.push('/');
    } catch (error: any) {
        console.error("Google Sign-In Error:", error);
         let description = "An unexpected error occurred during Google Sign-In.";
         // Handle specific errors like account-exists-with-different-credential
         if (error.code) {
             switch(error.code) {
                 case 'auth/account-exists-with-different-credential':
                     description = "An account already exists with this email address using a different sign-in method (e.g., email/password). Try logging in with that method.";
                     break;
                 case 'auth/popup-closed-by-user':
                     description = "Sign-in cancelled. The Google Sign-In popup was closed before completing.";
                      // Don't show a destructive toast for user cancellation
                     toast({ title: "Sign-in Cancelled", description: description });
                     setIsGoogleLoading(false);
                     return; // Exit early
                 case 'auth/popup-blocked-by-browser':
                      description = "Google Sign-In popup blocked by the browser. Please allow popups for this site.";
                      break;
                 case 'auth/network-request-failed':
                    description = "Network error. Please check your internet connection and try again.";
                    break;
                 case 'auth/api-key-not-valid':
                    description = "Authentication failed: Invalid API key. Please check the application configuration.";
                     console.error("Firebase API Key is invalid. Check your .env file and Firebase project settings.");
                    break;
                case 'auth/configuration-not-found':
                     description = "Authentication configuration error. Please ensure the Google sign-in method is enabled in your Firebase project settings.";
                     console.error("Google sign-in method not enabled in Firebase console.");
                     break;
                 default:
                     description = error.message || `Google Sign-In failed with code: ${error.code}`;
             }

         } else if (error.message?.includes("Firebase is not initialized") || error.message?.includes("auth is null")) {
            description = "Application configuration error. Could not connect to authentication service.";
         }

         toast({
             title: "Google Sign-In Failed",
             description: description,
             variant: "destructive",
         });

    } finally {
        setIsGoogleLoading(false);
    }
  };

   // Show loading spinner if auth is still loading
   if (loading) {
       return (
           <div className="flex items-center justify-center min-h-screen bg-background">
               <Loader2 className="h-16 w-16 animate-spin text-primary" />
           </div>
       )
   }

    // Display error if Firebase initialization failed
   if (firebaseInitializationError) {
      return (
           <div className="flex items-center justify-center min-h-screen bg-background p-4">
              <Alert variant="destructive" className="max-w-md">
                <AlertTitle>Application Error</AlertTitle>
                <AlertDescription>
                  Could not connect to authentication service. {firebaseInitializationError.message}
                </AlertDescription>
              </Alert>
           </div>
      );
  }


   // If user is loaded and exists, don't render the login form (will be redirected)
   if (user) {
       return null;
   }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          {/* Using inline SVG for the logo */}
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 mx-auto text-primary">
               <path d="M12 2L2 7l10 5 10-5-10-5z"/>
               <path d="M2 17l10 5 10-5"/>
               <path d="M2 12l10 5 10-5"/>
             </svg>
          <CardTitle className="text-2xl font-bold">NexusLearn AI</CardTitle>
          <CardDescription>{showSignupFields ? 'Create an account to get started' : 'Login to your account'}</CardDescription>
        </CardHeader>
        <form onSubmit={showSignupFields ? handleSignup : handleLogin}>
          <CardContent className="space-y-4">
             {showSignupFields && (
                 <div className="space-y-2">
                 <Label htmlFor="name">Name</Label>
                 <Input
                     id="name"
                     type="text"
                     placeholder="Your Name"
                     required
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     disabled={isLoggingIn || isSigningUp || isGoogleLoading}
                 />
                 </div>
             )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoggingIn || isSigningUp || isGoogleLoading}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoggingIn || isSigningUp || isGoogleLoading}
                placeholder={showSignupFields ? 'Create a password (min. 6 characters)' : 'Enter your password'}
                autoComplete={showSignupFields ? "new-password" : "current-password"}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
             {showSignupFields ? (
                <Button type="submit" className="w-full" disabled={isLoggingIn || isSigningUp || isGoogleLoading || !email || !password || !name}>
                    {isSigningUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Sign Up
                </Button>
             ) : (
                <Button type="submit" className="w-full" disabled={isLoggingIn || isSigningUp || isGoogleLoading || !email || !password}>
                    {isLoggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Login
                </Button>
             )}

             <Button type="button" variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoggingIn || isSigningUp || isGoogleLoading}>
                 {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
                     <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                         <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 109.8 512 0 398.9 0 256S109.8 0 244 0c71.8 0 139.8 29.4 188.1 77.4l-69.8 67.9C338.8 110.9 294.3 88 244 88c-78.2 0-141.7 64.2-141.7 143.1s63.5 143.1 141.7 143.1c92.8 0 124.1-68.2 128.7-102.9H244v-85.1h243.8c1.6 9.3 2.2 19.1 2.2 29.9z"></path>
                     </svg>
                 )}
                 Sign in with Google
             </Button>

             <Button
                type="button"
                variant="link"
                className="w-full text-sm"
                onClick={() => setShowSignupFields(!showSignupFields)}
                disabled={isLoggingIn || isSigningUp || isGoogleLoading}
                >
                {showSignupFields ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
             </Button>

             {/* Link for password reset (optional) */}
             {/* {!showSignupFields && (
                 <Link href="/forgot-password" className="text-sm text-muted-foreground hover:underline">
                    Forgot password?
                 </Link>
             )} */}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
