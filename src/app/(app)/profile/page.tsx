'use client';

import { useState, useEffect, type ChangeEvent } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress"; // Keep Progress for potential future use
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { db, ensureFirebaseInitialized, persistenceEnabled } from '@/lib/firebase/config'; // Import persistenceEnabled
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'; // Import Firestore getDoc variants
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, updateProfile as updateAuthProfile } from 'firebase/auth'; // Rename Firebase updateProfile
// Removed Firebase Storage imports as we are using Data URIs
import { Loader2, UploadCloud, AlertTriangle } from 'lucide-react';
import { getSchoolBoards, type SchoolBoard } from '@/services/school-board'; // Assuming this exists
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UserProfile } from '@/types/user'; // Import UserProfile type
import { Alert, AlertDescription } from '@/components/ui/alert';

// Max avatar size (e.g., 1MB) - adjust as needed
const MAX_AVATAR_SIZE = 1 * 1024 * 1024;

export default function ProfilePage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth(); // Get user from AuthContext

  // State for profile data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null); // Store Data URL for avatar
  const [schoolBoard, setSchoolBoard] = useState('');
  const [grade, setGrade] = useState('');
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState(''); // For re-authentication

  // Loading and state management
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [schoolBoards, setSchoolBoards] = useState<SchoolBoard[]>([]);
  const [isLoadingBoards, setIsLoadingBoards] = useState(true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null); // Still track the file for temporary use
  const [dataFetchSource, setDataFetchSource] = useState<'cache' | 'server' | 'default' | 'error'>('server'); // Track data source
  const [fetchError, setFetchError] = useState<string | null>(null); // Store fetch error

  // Fetch school boards (this typically won't be cached by Firestore persistence)
  useEffect(() => {
      const fetchBoards = async () => {
          setIsLoadingBoards(true);
          try {
              const boards = await getSchoolBoards(); // Assuming this makes a network request
              setSchoolBoards(boards);
          } catch (error) {
              console.error("Failed to fetch school boards:", error);
              toast({ title: "Error", description: "Could not load school boards list.", variant: "destructive" });
          } finally {
              setIsLoadingBoards(false);
          }
      };
      fetchBoards();
  }, [toast]);

  // Fetch user profile data from Firestore
  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        setIsLoading(true);
        setFetchError(null); // Reset error
        try {
            ensureFirebaseInitialized(); // Ensure Firebase is ready
            const userDocRef = doc(db!, 'users', user.uid);
            const docSnap = await getDoc(userDocRef);

            setDataFetchSource(docSnap.metadata.fromCache ? 'cache' : 'server');
            console.log(`Profile data fetched from ${docSnap.metadata.fromCache ? 'cache' : 'server'}.`);

            if (docSnap.exists()) {
                const data = docSnap.data() as UserProfile;
                // Basic validation (can be more thorough)
                if (data && typeof data.name === 'string' && typeof data.email === 'string') {
                    setProfile(data);
                    setName(data.name || user.displayName || '');
                    // Use avatarUrl from Firestore first, then auth, then fallback
                    const currentAvatar = data.avatarUrl || user.photoURL || `https://avatar.vercel.sh/${user.email}.png`;
                    setAvatarDataUrl(currentAvatar); // Set initial avatar display URL/Data URL
                    setSchoolBoard(data.schoolBoard || 'none'); // Default to 'none' if empty
                    setGrade(data.grade || 'none'); // Default to 'none' if empty
                } else {
                    console.warn("Fetched profile data has invalid structure:", data);
                    setFetchError("Profile data is corrupted. Creating default.");
                    await createDefaultProfile(userDocRef, user);
                    setDataFetchSource('default'); // Mark as default data
                }
            } else {
                 // Create a default profile if it doesn't exist
                 console.log("User document not found in Firestore for UID:", user.uid, ". Creating default profile.");
                 await createDefaultProfile(userDocRef, user);
                 setDataFetchSource('default');
                 setFetchError(null); // Clear any previous error if creating default
            }
        } catch (error: any) {
            console.error("Error fetching user profile:", error);
             let errorDesc = "Could not load profile data.";
             if (error.code === 'unavailable') {
                 errorDesc = "Network unavailable. Displaying cached or default data if possible.";
                 setDataFetchSource('error'); // Indicate data might be stale or default
             } else if (error.code === 'permission-denied') {
                 errorDesc = "Permission denied. Could not load profile. Check Firestore rules.";
                 console.error("Firestore permission denied. Check your security rules in firestore.rules and ensure they are deployed.");
                 setDataFetchSource('error');
             } else {
                  setDataFetchSource('error');
             }
             setFetchError(errorDesc);
             toast({ title: "Error Loading Profile", description: errorDesc, variant: "destructive" });
             // Attempt to show fallback data even on error
             setName(user.displayName || user.email?.split('@')[0] || 'User');
             const fallbackAvatar = user.photoURL || `https://avatar.vercel.sh/${user.email}.png`;
             setAvatarDataUrl(fallbackAvatar);
             setSchoolBoard('none'); // Default on error
             setGrade('none'); // Default on error
        } finally {
          setIsLoading(false);
        }
      };
      fetchProfile();
    } else if (!authLoading) {
        // Handle case where user is null after auth check (should be redirected by layout)
        setIsLoading(false);
        setFetchError("User not logged in.");
    }
  }, [user, authLoading, toast]); // Added toast dependency


    // Helper function to create and set the default profile
   const createDefaultProfile = async (docRef: any, currentUser: any) => {
        const defaultProfileData: UserProfile = {
            uid: currentUser.uid,
            name: currentUser.displayName || currentUser.email?.split('@')[0] || "New User",
            email: currentUser.email!,
            // Use auth photoURL if available, else generate fallback
            avatarUrl: currentUser.photoURL || `https://avatar.vercel.sh/${currentUser.email}.png`,
            schoolBoard: '', // Store empty in DB initially
            grade: '', // Store empty in DB initially
            joinDate: currentUser.metadata.creationTime ? new Date(currentUser.metadata.creationTime).toISOString() : new Date().toISOString(),
        };
         try {
             await setDoc(docRef, defaultProfileData); // This write will be queued if offline
             setProfile(defaultProfileData);
             setName(defaultProfileData.name);
             setAvatarDataUrl(defaultProfileData.avatarUrl); // Use the URL set in defaultProfileData
             setSchoolBoard('none'); // Set state to 'none'
             setGrade('none'); // Set state to 'none'
             console.log("Created/set default profile in Firestore (queued if offline).");
         } catch (creationError: any) {
             console.error("Error creating/setting default profile:", creationError);
             let errorDesc = "Could not initialize profile data.";
             if (creationError.code === 'permission-denied') {
                  errorDesc = "Permission denied. Cannot create default profile.";
             }
             toast({ title: "Error", description: errorDesc, variant: "destructive" });
             setFetchError(errorDesc); // Set fetch error state
             // Attempt to set local state even if Firestore write fails
             setProfile(defaultProfileData);
             setName(defaultProfileData.name);
             setAvatarDataUrl(defaultProfileData.avatarUrl);
             setSchoolBoard('none');
             setGrade('none');
         }
   }


  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          if (!file.type.startsWith('image/')) {
              toast({ title: "Invalid File", description: "Please select an image file (PNG, JPG, GIF, WEBP).", variant: "destructive" });
              setAvatarFile(null);
              // Don't reset preview immediately, let user see the original
              // setAvatarDataUrl(profile?.avatarUrl || user?.photoURL || `https://avatar.vercel.sh/${user?.email}.png`);
              event.target.value = '';
              return;
          }
          if (file.size > MAX_AVATAR_SIZE) {
               toast({ title: "File Too Large", description: `Avatar image must be smaller than ${MAX_AVATAR_SIZE / 1024 / 1024}MB.`, variant: "destructive" });
               setAvatarFile(null);
               event.target.value = '';
               return;
          }

          setAvatarFile(file); // Keep track of the selected file temporarily

          // Read the file as Data URL for preview and potential saving
          const reader = new FileReader();
          reader.onloadend = () => {
              setAvatarDataUrl(reader.result as string); // Update state with Data URL for preview
          };
          reader.readAsDataURL(file);

      } else {
           // If user cancels file selection, reset file state but keep current preview
           setAvatarFile(null);
      }
      // Don't clear event.target.value here, allows re-selecting the same file if needed
  };


   const handleUpdateProfile = async () => {
      if (!user) {
          toast({ title: "Error", description: "You must be logged in to update your profile.", variant: "destructive" });
          return;
      }
       // Re-check initialization just in case
       try {
           ensureFirebaseInitialized();
       } catch (initErr: any) {
            toast({ title: "Application Error", description: `Cannot save profile: ${initErr.message}`, variant: "destructive" });
            return;
       }

      setIsSaving(true);
      let finalAvatarUrl = profile?.avatarUrl || user.photoURL || `https://avatar.vercel.sh/${user?.email}.png`; // Start with existing URL or fallback

      // If a new avatar file was selected and converted to Data URL, use that
      if (avatarFile && avatarDataUrl && avatarDataUrl.startsWith('data:image')) {
          finalAvatarUrl = avatarDataUrl;
      }

      const userDocRef = doc(db!, 'users', user.uid);
      const changesToSave: Partial<Omit<UserProfile, 'uid' | 'email' | 'joinDate'>> = {
          name: name,
          avatarUrl: finalAvatarUrl, // Save the Data URL or the original URL
          schoolBoard: schoolBoard === 'none' ? '' : schoolBoard,
          grade: grade === 'none' ? '' : grade,
          // lastUpdated: serverTimestamp() // Consider adding if tracking updates is needed
      };

      try {
           // Update Firestore document (will be queued if offline)
           // Check if the document exists before updating, or use set with merge
           const docSnap = await getDoc(userDocRef);
           if (docSnap.exists()) {
                await updateDoc(userDocRef, changesToSave);
           } else {
               // If somehow the doc doesn't exist (e.g., error during initial creation),
               // create it now with the updated info + essentials.
               console.warn("Profile document didn't exist during update, creating now.");
               await setDoc(userDocRef, {
                   ...changesToSave,
                   uid: user.uid,
                   email: user.email!,
                   joinDate: profile?.joinDate || user.metadata.creationTime || new Date().toISOString(),
               });
           }
           console.log("Firestore profile update queued (will sync when online).");

           // Update local profile state immediately
            setProfile(prev => ({
                ...(prev || { uid: user.uid, email: user.email!, name: '', joinDate: new Date().toISOString() }), // Base default if prev is null
                ...changesToSave // Apply changes
            }));
            setAvatarFile(null); // Clear the temporary file state after saving


           // Attempt to update Firebase Auth profile (requires network)
           const authProfileNeedsUpdate = (name !== user.displayName || finalAvatarUrl !== user.photoURL);
           if (navigator.onLine && authProfileNeedsUpdate) {
               try {
                   await updateAuthProfile(user, {
                       displayName: name,
                       // Only update photoURL if it's *not* a Data URL (Firebase Auth expects a real URL)
                       photoURL: finalAvatarUrl.startsWith('http') ? finalAvatarUrl : user.photoURL,
                   });
                    console.log("Firebase Auth profile updated (if URL was http).");
               } catch (authUpdateError: any) {
                    console.warn("Could not update Firebase Auth profile (requires recent login or network):", authUpdateError);
                     if (authUpdateError.code === 'auth/requires-recent-login') {
                          toast({ title: "Auth Update Recommended", description: "Please log out and log back in to fully update your profile display name/picture.", variant: "default"});
                     } else {
                         toast({ title: "Auth Update Info", description: "Could not update auth profile details (name/picture). Firestore data saved.", variant: "default"});
                     }
               }
           } else if (!navigator.onLine && authProfileNeedsUpdate) {
                console.warn("Skipping Firebase Auth profile update while offline.");
           }


           // Handle password change (Requires network)
           if (password) {
               if (!navigator.onLine) {
                    toast({ title: "Offline", description: "Cannot change password while offline.", variant: "destructive"});
               } else if (!currentPassword) {
                   toast({ title: "Password Update Skipped", description: "Enter your current password to change it.", variant: "default" });
               } else {
                  try {
                      ensureFirebaseInitialized();
                      if (!user.email) throw new Error("User email is not available for re-authentication.");
                      const credential = EmailAuthProvider.credential(user.email, currentPassword);
                      console.log("Attempting re-authentication for password change...");
                      await reauthenticateWithCredential(user, credential);
                      console.log("Re-authentication successful. Attempting password update...");
                      await updatePassword(user, password);
                      console.log("Password update successful.");
                      toast({ title: "Password Updated", description: "Your password has been successfully updated." });
                      setPassword('');
                      setCurrentPassword('');
                   } catch(passwordError: any) {
                       console.error('Password update error:', passwordError);
                       let passErrorDesc = "Could not update password.";
                       if (passwordError.code === 'auth/wrong-password' || passwordError.code === 'auth/invalid-credential') {
                           passErrorDesc = "Incorrect current password. Password not updated.";
                       } else if (passwordError.code === 'auth/requires-recent-login') {
                            passErrorDesc = "Security check failed. Please log out and log back in to update your password.";
                       } else if (passwordError.code === 'auth/network-request-failed') {
                            passErrorDesc = "Network error. Could not update password.";
                       } else if (passwordError.code === 'auth/weak-password') {
                           passErrorDesc = "New password is too weak. Please choose a stronger one.";
                       } else {
                            passErrorDesc = `Password update failed: ${passwordError.message || passwordError.code}`;
                       }
                        toast({ title: "Password Update Failed", description: passErrorDesc, variant: "destructive" });
                   }
               }
           }

           toast({
               title: "Profile Update Saved",
               description: `Your profile information has been saved${persistenceEnabled ? ' (changes will sync when online)' : '.'}`,
           });
      } catch (error: any) {
           console.error('Error updating profile (Firestore or other):', error);
            let errorDesc = "Could not update profile Firestore data.";
            if (error.code === 'unavailable') {
                 errorDesc = "Network unavailable. Profile changes saved locally and will sync later.";
                 // Optimistic update already happened, so just inform user
                 toast({ title: "Offline", description: errorDesc, variant: "default"});
            } else if (error.code === 'permission-denied') {
                 errorDesc = "Permission denied. Could not save profile data. Check Firestore rules.";
                 console.error("Firestore permission denied during update. Check your security rules.");
                 // Revert optimistic update if save failed due to permissions
                  setProfile(profile); // Revert to original profile state
                  setName(profile?.name || '');
                  setAvatarDataUrl(profile?.avatarUrl || user.photoURL || `https://avatar.vercel.sh/${user?.email}.png`);
                  setSchoolBoard(profile?.schoolBoard || 'none');
                  setGrade(profile?.grade || 'none');
                 toast({ title: "Save Failed", description: errorDesc, variant: "destructive" });
            } else {
                // Generic save error, revert UI changes
                 setProfile(profile);
                 setName(profile?.name || '');
                 setAvatarDataUrl(profile?.avatarUrl || user.photoURL || `https://avatar.vercel.sh/${user?.email}.png`);
                 setSchoolBoard(profile?.schoolBoard || 'none');
                 setGrade(profile?.grade || 'none');
                 toast({ title: "Update Failed", description: error.message || errorDesc, variant: "destructive" });
            }
      } finally {
          setIsSaving(false);
      }
  };


  if (isLoading || authLoading || isLoadingBoards) {
      return (
          <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
      );
  }

   // Handle cases where user is not logged in or profile failed to load critically
   if (!user || (fetchError && !profile)) {
       return (
          <div className="container mx-auto py-8 text-center">
              <h1 className="text-3xl font-bold mb-6">My Profile</h1>
               <Alert variant="destructive" className="max-w-md mx-auto">
                 <AlertTriangle className="h-4 w-4" />
                 <AlertTitle>Error</AlertTitle>
                 <AlertDescription>{fetchError || "Please log in to view your profile."}</AlertDescription>
               </Alert>
          </div>
       );
   }


  const getInitials = (nameString: string | undefined) => {
    if (!nameString) return '??';
    const names = nameString.trim().split(' ');
    if (names.length === 1 && names[0] === '') return '??'; // Handle empty string case
    const initials = names.map(n => n[0]).join('');
    return initials.slice(0, 2).toUpperCase();
  }

   const formatJoinDate = (dateInput?: Date | string | { seconds: number, nanoseconds: number }) => {
       let date: Date | undefined;
       if (!dateInput) {
            return user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Not specified';
       }
       try {
           if (typeof dateInput === 'string') date = new Date(dateInput);
           else if (dateInput instanceof Date) date = dateInput;
           else if (typeof dateInput === 'object' && dateInput !== null && 'seconds' in dateInput) date = new Date(dateInput.seconds * 1000);

           return date && !isNaN(date.getTime()) ? date.toLocaleDateString() : 'Invalid Date';
       } catch (e) {
           console.error("Error formatting joinDate:", e);
           return 'Invalid Date';
       }
   }

   // Use 'none' as the value for the unselected state in Select components
   const schoolBoardValue = schoolBoard || 'none';
   const gradeValue = grade || 'none';
   const displayAvatar = avatarDataUrl || `https://avatar.vercel.sh/${user?.email}.png`; // Fallback if state is null

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>
      <p className="text-muted-foreground mb-8">
        View and update your personal information and account details.
         {dataFetchSource === 'cache' && <span className="ml-2 text-xs text-muted-foreground">(Showing offline data)</span>}
         {dataFetchSource === 'error' && fetchError && <span className="ml-2 text-xs text-destructive">({fetchError})</span>}
      </p>

      <Card className="max-w-2xl mx-auto">
        <CardHeader className="flex flex-col items-center text-center">
           <div className="relative group">
             <Avatar className="h-24 w-24 mb-4">
               {/* Key forces re-render if URL/Data URL changes */}
               <AvatarImage key={displayAvatar} src={displayAvatar} alt={name} data-ai-hint="user avatar placeholder" />
               <AvatarFallback>{getInitials(name)}</AvatarFallback>
             </Avatar>
              <Label htmlFor="avatar-upload" className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                <UploadCloud className="h-8 w-8" />
                 <Input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} className="sr-only" disabled={isSaving}/>
             </Label>
           </div>
           {/* Progress bar removed as Data URL generation is instant */}
           {avatarFile && (
             <p className="text-xs text-muted-foreground mt-1">New avatar selected. Click Update Profile to save.</p>
           )}

          <CardTitle className="text-2xl mt-2">{name}</CardTitle>
          <CardDescription>{user?.email}</CardDescription> {/* Use safe access */}
          <div className="flex flex-wrap justify-center gap-2 mt-2">
             {schoolBoardValue !== 'none' && <Badge variant="secondary">{schoolBoards.find(b => b.id === schoolBoardValue)?.name || schoolBoardValue}</Badge>}
             {gradeValue !== 'none' && <Badge variant="outline">Grade {gradeValue}</Badge>}
             {dataFetchSource === 'cache' && <Badge variant="outline" className="text-blue-600 border-blue-300">Offline</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isSaving}/>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" value={user?.email!} readOnly disabled />
            <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
          </div>

           {/* Learning Preferences */}
          <div className="space-y-2">
              <Label htmlFor="school-board">School Board</Label>
              <Select
                  value={schoolBoardValue} // Use state value here
                  onValueChange={setSchoolBoard}
                  disabled={isLoadingBoards || isSaving}
              >
                  <SelectTrigger id="school-board">
                      <SelectValue placeholder={isLoadingBoards ? "Loading boards..." : "Select board..."} />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="none">None / Not Specified</SelectItem>
                      {schoolBoards.map(board => (
                          <SelectItem key={board.id} value={board.id}>{board.name}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
          </div>
          <div className="space-y-2">
              <Label htmlFor="grade-level">Grade Level</Label>
              <Select
                  value={gradeValue} // Use state value here
                  onValueChange={setGrade}
                  disabled={isSaving}
              >
                  <SelectTrigger id="grade-level">
                      <SelectValue placeholder="Select grade..." />
                  </SelectTrigger>
                  <SelectContent>
                       <SelectItem value="none">None / Not Specified</SelectItem>
                      {[...Array(12)].map((_, i) => (
                          <SelectItem key={i + 1} value={`${i + 1}`}>Grade {i + 1}</SelectItem>
                      ))}
                      <SelectItem value="other">Other/Not Applicable</SelectItem> {/* Added Other option */}
                  </SelectContent>
              </Select>
          </div>

           {/* Password Change Section */}
           <div className="border-t pt-6 space-y-4">
              <p className="font-medium">Change Password</p>
              <div className="space-y-2">
                 <Label htmlFor="current-password">Current Password</Label>
                 <Input
                    id="current-password"
                    type="password"
                    placeholder="Enter current password (required to change)"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={isSaving}
                    autoComplete="current-password"
                  />
              </div>
               <div className="space-y-2">
                 <Label htmlFor="new-password">New Password</Label>
                 <Input
                    id="new-password"
                    type="password"
                    placeholder="Enter new password (leave blank to keep current)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSaving}
                    autoComplete="new-password"
                  />
               </div>
               {!navigator.onLine && password && (
                    <p className="text-xs text-destructive">Password change requires an internet connection.</p>
               )}
            </div>


          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Member since: {formatJoinDate(profile?.joinDate)}
            </p>
          </div>

        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleUpdateProfile} disabled={isSaving}>
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Update Profile'}
          </Button>
        </CardFooter>
      </Card>

    </div>
  );
}

