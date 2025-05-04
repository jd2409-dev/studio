
'use client';

import { useState, useEffect, type ChangeEvent } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { db, storage, ensureFirebaseInitialized, persistenceEnabled } from '@/lib/firebase/config'; // Import persistenceEnabled
import { doc, getDoc, setDoc, updateDoc, getDocFromCache, getDocFromServer } from 'firebase/firestore'; // Import Firestore getDoc variants
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, updateProfile as updateAuthProfile } from 'firebase/auth'; // Rename Firebase updateProfile
import { ref, uploadBytesResumable, getDownloadURL, type UploadTaskSnapshot } from "firebase/storage"; // Import storage functions
import { Loader2, UploadCloud } from 'lucide-react';
import { getSchoolBoards, type SchoolBoard } from '@/services/school-board'; // Assuming this exists
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UserProfile } from '@/types/user'; // Import UserProfile type

export default function ProfilePage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth(); // Get user from AuthContext

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [schoolBoard, setSchoolBoard] = useState('');
  const [grade, setGrade] = useState('');
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState(''); // For re-authentication
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [schoolBoards, setSchoolBoards] = useState<SchoolBoard[]>([]);
  const [isLoadingBoards, setIsLoadingBoards] = useState(true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploadProgress, setAvatarUploadProgress] = useState<number | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [dataFetchSource, setDataFetchSource] = useState<'cache' | 'server' | 'default' | 'error'>('server'); // Track data source

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
        ensureFirebaseInitialized(); // Ensure Firebase is ready
        const userDocRef = doc(db!, 'users', user.uid);
        try {
          // Fetch user profile - Firestore handles offline persistence
          const docSnap = await getDoc(userDocRef);

          setDataFetchSource(docSnap.metadata.fromCache ? 'cache' : 'server');
          console.log(`Profile data fetched from ${docSnap.metadata.fromCache ? 'cache' : 'server'}.`);

          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setProfile(data);
            setName(data.name || user.displayName || '');
            const currentAvatar = data.avatarUrl || user.photoURL || `https://avatar.vercel.sh/${user.email}.png`;
            setAvatarUrl(currentAvatar);
            setAvatarPreview(currentAvatar); // Set initial preview
            setSchoolBoard(data.schoolBoard || '');
            setGrade(data.grade || '');
          } else {
             // Create a default profile if it doesn't exist
             console.warn("User document not found in Firestore for UID:", user.uid);
             const defaultProfile: UserProfile = {
                 uid: user.uid,
                 name: user.displayName || user.email?.split('@')[0] || "New User",
                 email: user.email!,
                 avatarUrl: user.photoURL || `https://avatar.vercel.sh/${user.email}.png`,
                 schoolBoard: '',
                 grade: '',
                 joinDate: user.metadata.creationTime ? new Date(user.metadata.creationTime).toISOString() : new Date().toISOString(),
             };
              try {
                  await setDoc(userDocRef, defaultProfile); // This write will be queued if offline
                  setProfile(defaultProfile);
                  setName(defaultProfile.name);
                  const currentAvatar = defaultProfile.avatarUrl;
                  setAvatarUrl(currentAvatar);
                  setAvatarPreview(currentAvatar);
                  setDataFetchSource('default');
                  console.log("Created default profile in Firestore (queued if offline).");
              } catch (creationError) {
                  console.error("Error creating default profile:", creationError);
                   toast({ title: "Error", description: "Could not create profile data.", variant: "destructive" });
                   setDataFetchSource('error');
              }
          }
        } catch (error: any) {
          console.error("Error fetching user profile:", error);
           if (error.code === 'unavailable') {
               toast({ title: "Offline", description: "Could not reach server to fetch profile. Displaying cached or default data.", variant: "default" });
               setDataFetchSource('error'); // Indicate data might be stale or default
           } else {
              toast({ title: "Error", description: "Could not load profile data.", variant: "destructive" });
              setDataFetchSource('error');
           }
           // Attempt to show fallback data even on error
           setName(user.displayName || user.email?.split('@')[0] || 'User');
           const fallbackAvatar = user.photoURL || `https://avatar.vercel.sh/${user.email}.png`;
           setAvatarUrl(fallbackAvatar);
           setAvatarPreview(fallbackAvatar);
        } finally {
          setIsLoading(false);
        }
      };
      fetchProfile();
    } else if (!authLoading) {
        // Handle case where user is null after auth check (should be redirected by layout)
        setIsLoading(false);
    }
  }, [user, authLoading, toast]);

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && file.type.startsWith('image/')) {
          setAvatarFile(file);
          const reader = new FileReader();
          reader.onloadend = () => {
              setAvatarPreview(reader.result as string);
          };
          reader.readAsDataURL(file);
          setAvatarUploadProgress(null); // Reset progress for new file
      } else {
          setAvatarFile(null);
          setAvatarPreview(avatarUrl); // Reset preview to original URL if invalid file
          if (file) { // Only toast if a file was actually selected but invalid
             toast({ title: "Invalid File", description: "Please select an image file.", variant: "destructive"});
          }
      }
      event.target.value = '';
  };

  // Note: Avatar upload requires network connection. Consider disabling if offline.
  const uploadAvatar = (): Promise<string> => {
      return new Promise(async (resolve, reject) => {
          if (!navigator.onLine) { // Check network status
               toast({ title: "Offline", description: "Cannot upload avatar while offline.", variant: "destructive" });
               return reject(new Error("Offline"));
           }
          if (!avatarFile || !user) {
              return reject(new Error("No avatar file selected or user not logged in."));
          }

          setIsUploadingAvatar(true);
          setAvatarUploadProgress(0);

          try {
              ensureFirebaseInitialized();
              const storageRef = ref(storage!, `user_avatars/${user.uid}/${Date.now()}_${avatarFile.name}`);
              const uploadTask = uploadBytesResumable(storageRef, avatarFile);

              uploadTask.on('state_changed',
                  (snapshot: UploadTaskSnapshot) => {
                      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                      setAvatarUploadProgress(progress);
                  },
                  (error) => {
                      console.error("Avatar Upload Error:", error);
                       let errorMessage = "Failed to upload avatar.";
                       switch (error.code) {
                            case 'storage/unauthorized': errorMessage = "Permission denied."; break;
                            case 'storage/canceled': errorMessage = "Upload cancelled."; break;
                            case 'storage/unknown': errorMessage = "Unknown storage error."; break;
                            case 'storage/retry-limit-exceeded': errorMessage = "Network error during upload. Please try again."; break;
                       }
                      toast({ title: "Avatar Upload Failed", description: errorMessage, variant: "destructive" });
                      setIsUploadingAvatar(false);
                      setAvatarUploadProgress(null);
                      reject(error);
                  },
                  async () => {
                      try {
                          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                          console.log('Avatar uploaded to:', downloadURL);
                          setAvatarUrl(downloadURL);
                          setIsUploadingAvatar(false);
                          setAvatarUploadProgress(100);
                          resolve(downloadURL);
                      } catch (urlError) {
                          console.error("Error getting avatar download URL:", urlError);
                          toast({ title: "Avatar Upload Failed", description: "Could not get avatar URL after upload.", variant: "destructive" });
                          setIsUploadingAvatar(false);
                           setAvatarUploadProgress(null);
                          reject(urlError);
                      }
                  }
              );
          } catch (initError) {
              console.error("Firebase Storage init error:", initError);
              toast({ title: "Error", description: "Could not initialize avatar upload.", variant: "destructive" });
              setIsUploadingAvatar(false);
               setAvatarUploadProgress(null);
              reject(initError);
          }
      });
  };


   const handleUpdateProfile = async () => {
      if (!user || !profile) return;

      setIsUpdating(true);
      let finalAvatarUrl = avatarUrl; // Start with the current URL

      try {
           // 1. Upload new avatar if selected (Requires network)
           if (avatarFile) {
                if (!navigator.onLine) {
                    toast({ title: "Offline", description: "Cannot upload avatar while offline. Other changes will be saved.", variant: "default" });
                    // Continue with other updates, but don't try to upload
                } else {
                    try {
                       finalAvatarUrl = await uploadAvatar(); // This updates avatarUrl state on success
                       setAvatarFile(null); // Clear file only if upload was attempted and successful
                       setAvatarUploadProgress(null);
                    } catch (uploadError) {
                        // Error already toasted in uploadAvatar, just stop processing avatar part
                        console.error("Avatar upload failed, continuing with other profile updates.");
                        // Do not clear avatarFile here, user might want to retry
                    }
                }
           }

           // 2. Prepare data to update in Firestore
           const userDocRef = doc(db!, 'users', user.uid);
           const updatedProfileData: Partial<Omit<UserProfile, 'uid' | 'email' | 'joinDate'>> = {
               name: name,
               avatarUrl: finalAvatarUrl, // Use the potentially updated URL
               schoolBoard: schoolBoard,
               grade: grade,
               // lastUpdated: serverTimestamp() // Optional: Track update time
           };

           // 3. Update Firestore document (will be queued if offline)
           await updateDoc(userDocRef, updatedProfileData);
           console.log("Firestore profile update queued (will sync when online).");

            // 4. Update Firebase Auth profile (name and photoURL) - Requires network
            // Only attempt if online and avatar didn't fail previously (or wasn't changed)
           if (navigator.onLine && (finalAvatarUrl === avatarUrl || (avatarFile && finalAvatarUrl !== avatarUrl) ) ) {
               try {
                   await updateAuthProfile(user, {
                       displayName: name,
                       photoURL: finalAvatarUrl, // Use the final URL (new or existing)
                   });
                    console.log("Firebase Auth profile updated.");
               } catch (authUpdateError: any) {
                    console.warn("Could not update Firebase Auth profile (requires recent login or network):", authUpdateError);
                    // Non-critical, don't block the toast
                    toast({ title: "Auth Update Skipped", description: "Could not update auth profile details (may require re-login). Firestore data saved.", variant: "default"});
               }
           } else if (!navigator.onLine) {
                console.warn("Skipping Firebase Auth profile update while offline.");
           }


           // 5. Handle password change if a new password is entered (Requires network)
           if (password) {
               if (!navigator.onLine) {
                    toast({ title: "Offline", description: "Cannot change password while offline.", variant: "destructive"});
               } else if (!currentPassword) {
                   toast({
                       title: "Password Update Skipped",
                       description: "Enter your current password to change it.",
                       variant: "default",
                   });
               } else {
                  try {
                      // Re-authenticate user before password update
                      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
                      await reauthenticateWithCredential(user, credential);

                      // Update password in Firebase Auth
                      await updatePassword(user, password);
                      toast({
                          title: "Password Updated",
                          description: "Your password has been successfully updated.",
                      });
                      setPassword(''); // Clear password fields
                      setCurrentPassword('');
                   } catch(passwordError: any) {
                       console.error('Password update error:', passwordError);
                       let passErrorDesc = "Could not update password.";
                       if (passwordError.code === 'auth/wrong-password') {
                           passErrorDesc = "Incorrect current password. Password not updated.";
                       } else if (passwordError.code === 'auth/requires-recent-login') {
                            passErrorDesc = "Please log out and log back in to update your password.";
                       } else if (passwordError.code === 'auth/network-request-failed') {
                            passErrorDesc = "Network error. Could not update password.";
                       } else {
                            passErrorDesc = passwordError.message || passErrorDesc;
                       }
                        toast({ title: "Password Update Failed", description: passErrorDesc, variant: "destructive" });
                   }
               }
           }

           // 6. Update local state optimistically
            setProfile(prev => prev ? { ...prev, ...updatedProfileData } : null);
            // Clear file/progress only if upload was successful or not attempted
             if (!avatarFile || (avatarFile && finalAvatarUrl !== avatarUrl)) {
                setAvatarFile(null);
                setAvatarUploadProgress(null);
             }


           toast({
               title: "Profile Update Saved",
               description: `Your profile information has been saved${persistenceEnabled ? ' (changes will sync when online)' : '.'}`,
           });
      } catch (error: any) {
           console.error('Error updating profile:', error);
            // Handle errors from Firestore update
            if (error.code === 'unavailable') {
                 toast({ title: "Offline", description: "Network unavailable. Profile changes saved locally and will sync later.", variant: "default"});
                 // Update local state optimistically even if Firestore write failed due to network
                 setProfile(prev => prev ? { ...prev, ...updatedProfileData } : null);
            } else if (!error.code?.startsWith('storage/')) { // Avoid double-toasting storage errors
                toast({
                  title: "Update Failed",
                  description: error.message || "Could not update profile Firestore data. Please try again.",
                  variant: "destructive",
                });
            }
      } finally {
          setIsUpdating(false);
          setIsUploadingAvatar(false); // Ensure this is reset
      }
  };


  if (isLoading || authLoading || isLoadingBoards) {
      return (
          <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
      );
  }

   if (!user) { // Removed !profile check as profile might be null briefly during creation
       return <p className="text-center text-muted-foreground">Please log in to view your profile.</p>;
   }


  const getInitials = (nameString: string) => {
    if (!nameString) return '??';
    const names = nameString.split(' ');
    const initials = names.map(n => n[0]).join('');
    return initials.slice(0, 2).toUpperCase();
  }

   const formatJoinDate = (dateInput?: Date | string | { seconds: number, nanoseconds: number }) => {
       let date: Date | undefined;

        if (!dateInput) {
           // Fallback using auth metadata if Firestore data is missing/invalid
            return user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Not specified';
        }

       try {
           if (typeof dateInput === 'string') {
                date = new Date(dateInput);
           } else if (dateInput instanceof Date) {
                date = dateInput;
           } else if (typeof dateInput === 'object' && dateInput !== null && 'seconds' in dateInput) {
                // Handle Firestore Timestamp object { seconds, nanoseconds }
                date = new Date(dateInput.seconds * 1000);
           }

            if (date && !isNaN(date.getTime())) {
               return date.toLocaleDateString();
            } else {
                 console.warn("Invalid date format for joinDate:", dateInput);
                return 'Invalid Date';
            }
       } catch (e) {
            console.error("Error formatting joinDate:", e);
           return 'Invalid Date';
       }
   }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>
      <p className="text-muted-foreground mb-8">
        View and update your personal information and account details.
         {dataFetchSource === 'cache' && <span className="ml-2 text-xs">(Showing offline data)</span>}
      </p>

      <Card className="max-w-2xl mx-auto">
        <CardHeader className="flex flex-col items-center text-center">
           <div className="relative group">
             <Avatar className="h-24 w-24 mb-4">
               {/* Use key to force re-render if preview changes */}
               <AvatarImage key={avatarPreview || avatarUrl} src={avatarPreview || avatarUrl} alt={name} data-ai-hint="user avatar placeholder" />
               <AvatarFallback>{getInitials(name)}</AvatarFallback>
             </Avatar>
              <Label htmlFor="avatar-upload" className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                <UploadCloud className="h-8 w-8" />
                 <Input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} className="sr-only" disabled={isUpdating || isUploadingAvatar}/>
             </Label>
           </div>
           {isUploadingAvatar && avatarUploadProgress !== null && (
               <Progress value={avatarUploadProgress} className="w-24 h-1 mt-1" />
           )}
           {avatarFile && !isUploadingAvatar && (
             <p className="text-xs text-muted-foreground mt-1">New avatar selected. Click Update Profile to save.</p>
           )}

          <CardTitle className="text-2xl mt-2">{name}</CardTitle>
          <CardDescription>{user.email}</CardDescription>
          <div className="flex gap-2 mt-2">
            {schoolBoard && <Badge variant="secondary">{schoolBoards.find(b => b.id === schoolBoard)?.name || schoolBoard}</Badge>}
            {grade && <Badge variant="outline">Grade {grade}</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isUpdating}/>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" value={user.email!} readOnly disabled />
            <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
          </div>

           {/* Learning Preferences */}
          <div className="space-y-2">
              <Label htmlFor="school-board">School Board</Label>
              <Select
                  value={schoolBoard}
                  onValueChange={setSchoolBoard}
                  disabled={isLoadingBoards || isUpdating}
              >
                  <SelectTrigger id="school-board">
                      <SelectValue placeholder={isLoadingBoards ? "Loading boards..." : "Select board..."} />
                  </SelectTrigger>
                  <SelectContent>
                      {schoolBoards.map(board => (
                          <SelectItem key={board.id} value={board.id}>{board.name}</SelectItem>
                      ))}
                      <SelectItem value="">None / Not Specified</SelectItem>
                  </SelectContent>
              </Select>
          </div>
          <div className="space-y-2">
              <Label htmlFor="grade-level">Grade Level</Label>
              <Select
                  value={grade}
                  onValueChange={setGrade}
                  disabled={isUpdating}
              >
                  <SelectTrigger id="grade-level">
                      <SelectValue placeholder="Select grade..." />
                  </SelectTrigger>
                  <SelectContent>
                      {[...Array(12)].map((_, i) => (
                          <SelectItem key={i + 1} value={`${i + 1}`}>Grade {i + 1}</SelectItem>
                      ))}
                      <SelectItem value="">None / Not Specified</SelectItem>
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
                    disabled={isUpdating}
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
                    disabled={isUpdating}
                    autoComplete="new-password"
                  />
               </div>
               {!navigator.onLine && (
                    <p className="text-xs text-destructive">Password change requires an internet connection.</p>
               )}
            </div>


          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Member since: {profile ? formatJoinDate(profile.joinDate) : 'Loading...'}
            </p>
          </div>

        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleUpdateProfile} disabled={isUpdating || isUploadingAvatar}>
            {isUpdating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : 'Update Profile'}
          </Button>
        </CardFooter>
      </Card>

    </div>
  );
}
