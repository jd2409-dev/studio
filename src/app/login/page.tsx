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
import { auth, db } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { Loader2 } from 'lucide-react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import type { UserProfile } from '@/types/user'; // Import UserProfile type

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
      const userDocRef = doc(db, 'users', userId);
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
    if (!email || !password) {
        toast({ title: "Error", description: "Please enter email and password.", variant: "destructive"});
        return;
    }
    setIsLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Login Successful",
        description: "Redirecting to dashboard.",
      });
      router.push('/'); // Redirect on successful login
    } catch (error: any) {
      console.error("Login Error:", error);
      toast({
        title: "Login Failed",
        description: error.message || "Please check your email and password.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignup = async (e?: FormEvent) => {
    e?.preventDefault(); // Prevent default form submission if called from form
    if (!email || !password || !name) {
        toast({ title: "Error", description: "Please enter name, email, and password.", variant: "destructive"});
        return;
    }
    setIsSigningUp(true);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
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
        toast({
            title: "Signup Failed",
            description: error.message || "Could not create account. Please try again.",
            variant: "destructive",
        });
    } finally {
        setIsSigningUp(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
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
         // Handle specific errors like account-exists-with-different-credential
         if (error.code === 'auth/account-exists-with-different-credential') {
             toast({
                 title: "Sign-in Failed",
                 description: "An account already exists with this email address using a different sign-in method.",
                 variant: "destructive",
             });
         } else {
             toast({
                 title: "Google Sign-In Failed",
                 description: error.message || "Could not sign in with Google. Please try again.",
                 variant: "destructive",
             });
         }
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
                placeholder={showSignupFields ? 'Create a password' : 'Enter your password'}
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
