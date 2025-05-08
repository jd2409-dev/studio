'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, updateProfile } from 'firebase/auth';
import { auth, db, firebaseInitializationError, ensureFirebaseInitialized } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { Loader2, AlertTriangle } from 'lucide-react'; // Added AlertTriangle
import { doc, setDoc, getDoc } from 'firebase/firestore';
import type { UserProfile } from '@/types/user';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showSignupFields, setShowSignupFields] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth(); // Renamed loading to authLoading

  useEffect(() => {
      if (!authLoading && user) {
          router.push('/');
      }
  }, [user, authLoading, router]);

  const createFirestoreUserProfile = async (userId: string, userEmail: string, userName: string, photoURL?: string | null) => {
       ensureFirebaseInitialized();
      const userDocRef = doc(db!, 'users', userId);
      try {
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists()) {
            const defaultProfile: UserProfile = {
                uid: userId,
                name: userName || userEmail.split('@')[0] || "New User",
                email: userEmail,
                avatarUrl: photoURL || `https://avatar.vercel.sh/${userEmail}.png`,
                schoolBoard: '',
                grade: '',
                joinDate: new Date().toISOString(),
            };
            await setDoc(userDocRef, defaultProfile);
            console.log("Created Firestore user profile for:", userId);
        } else {
           console.log("Firestore user profile already exists for:", userId);
        }
      } catch (error) {
         console.error("Error creating/checking Firestore profile:", error);
         // Log error but proceed, user is authenticated at this point
         toast({
             title: "Profile Creation Warning",
             description: "Could not create or verify user profile data in the database. Some features might be limited.",
             variant: "default",
         });
      }
  };


  const handleLogin = async (e?: FormEvent) => {
    e?.preventDefault();
    setIsLoggingIn(true); // Start loading indicator *before* async operation
    try {
        ensureFirebaseInitialized();
        if (!email || !password) {
            toast({ title: "Error", description: "Please enter email and password.", variant = "destructive"});
            setIsLoggingIn(false); // Stop loading if validation fails
            return;
        }
        await signInWithEmailAndPassword(auth!, email, password);
        toast({
            title: "Login Successful",
            description: "Redirecting to dashboard.",
        });
        router.push('/');
    } catch (error: any) {
      console.error("Login Error:", error);
       let description = "An unexpected error occurred during login.";
       if (error.code) {
           switch (error.code) {
                case 'auth/invalid-credential':
                   description = "Invalid email or password."; break;
                case 'auth/invalid-email':
                     description = "Please enter a valid email."; break;
               case 'auth/user-disabled':
                   description = "This account has been disabled."; break;
               case 'auth/too-many-requests':
                    description = "Too many failed login attempts. Please try again later or reset your password."; break;
                case 'auth/network-request-failed':
                    description = "Network error. Check connection."; break;
                case 'auth/api-key-not-valid':
                    description = "Authentication failed: Invalid configuration."; break;
                case 'auth/configuration-not-found':
                     description = "Authentication error. Ensure Email/Password sign-in is enabled."; break;
                case 'auth/unauthorized-domain':
                     description = "Domain not authorized for login."; break;
               default:
                 description = error.message || `Login failed with code: ${error.code}`;
           }
       } else if (error.message?.includes("Firebase is not initialized") || error.message?.includes("auth is null")) {
            description = "Application configuration error.";
       }
      toast({ title: "Login Failed", description: description, variant = "destructive" });
    } finally {
      setIsLoggingIn(false); // Stop loading indicator regardless of success/failure
    }
  };

  const handleSignup = async (e?: FormEvent) => {
    e?.preventDefault();
    setIsSigningUp(true); // Start loading indicator *before* async operation
     try {
        ensureFirebaseInitialized();
        if (!email || !password || !name) {
            toast({ title: "Error", description: "Please enter name, email, and password.", variant = "destructive"});
            setIsSigningUp(false); // Stop loading if validation fails
            return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth!, email, password);
        const newUser = userCredential.user;
        await updateProfile(newUser, { displayName: name });
        await createFirestoreUserProfile(newUser.uid, newUser.email!, name, newUser.photoURL);

        toast({ title: "Signup Successful", description: "Account created. Redirecting...", });
        router.push('/');
    } catch (error: any) {
        console.error("Signup Error:", error);
        let description = "An unexpected error occurred during signup.";
        if (error.code) {
            switch (error.code) {
                case 'auth/email-already-in-use': description = "Email already in use."; break;
                case 'auth/invalid-email': description = "Please enter a valid email."; break;
                case 'auth/weak-password': description = "Password too weak (min. 6 characters)."; break;
                 case 'auth/network-request-failed': description = "Network error. Check connection."; break;
                 case 'auth/api-key-not-valid': description = "Authentication failed: Invalid configuration."; break;
                 case 'auth/configuration-not-found': description = "Authentication error. Ensure Email/Password sign-in is enabled."; break;
                 case 'auth/unauthorized-domain': description = "Domain not authorized for signup."; break;
                default: description = error.message || `Signup failed with code: ${error.code}`;
            }
        } else if (error.message?.includes("Firebase is not initialized") || error.message?.includes("auth is null")) {
            description = "Application configuration error.";
       }
        toast({ title: "Signup Failed", description: description, variant = "destructive" });
    } finally {
        setIsSigningUp(false); // Stop loading indicator regardless of success/failure
    }
  };

  const handleGoogleSignIn = async () => {
     setIsGoogleLoading(true); // Start loading indicator *before* async operation
     try {
        ensureFirebaseInitialized();
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth!, provider);
        const googleUser = result.user;
        await createFirestoreUserProfile(googleUser.uid, googleUser.email!, googleUser.displayName || '', googleUser.photoURL);

        toast({ title: "Google Sign-In Successful", description: "Redirecting...", });
        router.push('/');
    } catch (error: any) {
        console.error("Google Sign-In Error:", error);
         let description = "An unexpected error occurred during Google Sign-In.";
         if (error.code) {
             switch(error.code) {
                 case 'auth/account-exists-with-different-credential':
                     description = "Account exists with a different sign-in method (e.g., email/password)."; break;
                 case 'auth/popup-closed-by-user':
                     description = "Sign-in cancelled.";
                     toast({ title: "Sign-in Cancelled", description: description });
                     setIsGoogleLoading(false); // Stop loading here for cancellation
                     return;
                 case 'auth/popup-blocked-by-browser':
                      description = "Sign-In popup blocked by browser."; break;
                 case 'auth/network-request-failed':
                    description = "Network error. Check connection."; break;
                 case 'auth/api-key-not-valid':
                    description = "Authentication failed: Invalid configuration."; break;
                case 'auth/configuration-not-found':
                     description = "Authentication error. Ensure Google sign-in is enabled."; break;
                case 'auth/unauthorized-domain':
                     description = "Domain not authorized for Google Sign-In."; break;
                 default:
                     description = error.message || `Google Sign-In failed with code: ${error.code}`;
             }
         } else if (error.message?.includes("Firebase is not initialized") || error.message?.includes("auth is null")) {
            description = "Application configuration error.";
         }
         toast({ title: "Google Sign-In Failed", description: description, variant = "destructive" });
    } finally {
        // Ensure loading stops unless it was stopped early (e.g., for cancellation)
        if (isGoogleLoading) {
             setIsGoogleLoading(false);
        }
    }
  };

   // Render loading state for the entire component if auth is still resolving
   if (authLoading) {
       return (
           <div className="flex items-center justify-center min-h-screen bg-background">
               <Loader2 className="h-16 w-16 animate-spin text-primary" />
           </div>
       )
   }

    // Render error if Firebase initialization failed (Auth Provider handles this mostly)
   if (firebaseInitializationError) {
      return (
           <div className="flex items-center justify-center min-h-screen bg-background p-4">
              <Alert variant = "destructive" className="max-w-md">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Application Error</AlertTitle>
                <AlertDescription>
                  Could not connect to authentication service. {firebaseInitializationError.message}
                </AlertDescription>
              </Alert>
           </div>
      );
  }

   // If user exists after loading, redirect is handled by useEffect, render null briefly
   if (user) {
       return null;
   }

   // Determine if any action is in progress
   const isAnyLoading = isLoggingIn || isSigningUp || isGoogleLoading;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
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
                     disabled={isAnyLoading}
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
                disabled={isAnyLoading}
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
                disabled={isAnyLoading}
                placeholder={showSignupFields ? 'Create a password (min. 6 characters)' : 'Enter your password'}
                autoComplete={showSignupFields ? "new-password" : "current-password"}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
             {showSignupFields ? (
                <Button type="submit" className="w-full" disabled={isAnyLoading || !email || !password || !name}>
                    {isSigningUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Sign Up
                </Button>
             ) : (
                <Button type="submit" className="w-full" disabled={isAnyLoading || !email || !password}>
                    {isLoggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Login
                </Button>
             )}

             <Button type="button" variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isAnyLoading}>
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
                disabled={isAnyLoading}
                >
                {showSignupFields ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
             </Button>

          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

    