
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
import { db, storage, ensureFirebaseInitialized } from '@/lib/firebase/config'; // Import storage
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
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


  // Fetch school boards
  useEffect(() => {
      const fetchBoards = async () => {
          setIsLoadingBoards(true);
          try {
              const boards = await getSchoolBoards();
              setSchoolBoards(boards);
          } catch (error) {
              console.error("Failed to fetch school boards:", error);
              toast({ title: "Error", description: "Could not load school boards.", variant: "destructive" });
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
        const userDocRef = doc(db!, 'users', user.uid);
        try {
          const docSnap = await getDoc(userDocRef);
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
            // Create a default profile if it doesn't exist (should ideally be created on signup)
             console.warn("User document not found in Firestore for UID:", user.uid);
             // Attempt to create a profile based on auth info
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
                  await setDoc(userDocRef, defaultProfile);
                  setProfile(defaultProfile);
                  setName(defaultProfile.name);
                  const currentAvatar = defaultProfile.avatarUrl;
                  setAvatarUrl(currentAvatar);
                  setAvatarPreview(currentAvatar); // Set initial preview
                  console.log("Created default profile in Firestore.");
              } catch (creationError) {
                  console.error("Error creating default profile:", creationError);
                   toast({ title: "Error", description: "Could not create profile data.", variant: "destructive" });
              }
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          toast({ title: "Error", description: "Could not load profile data.", variant: "destructive" });
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
          reader.readDataURL(file);
          setAvatarUploadProgress(null); // Reset progress for new file
      } else {
          setAvatarFile(null);
          setAvatarPreview(avatarUrl); // Reset preview to original URL if invalid file
          if (file) { // Only toast if a file was actually selected but invalid
             toast({ title: "Invalid File", description: "Please select an image file.", variant: "destructive"});
          }
      }
       // Reset the input value to allow selecting the same file again after clearing
      event.target.value = '';
  };

  const uploadAvatar = (): Promise<string> => {
      return new Promise(async (resolve, reject) => {
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
                           // Add more specific cases if needed
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
                          setAvatarUrl(downloadURL); // Update the URL state used for saving
                          setIsUploadingAvatar(false);
                          setAvatarUploadProgress(100); // Ensure it hits 100% on completion
                          resolve(downloadURL); // Resolve the promise with the new URL
                      } catch (urlError) {
                          console.error("Error getting avatar download URL:", urlError);
                          toast({ title: "Avatar Upload Failed", description: "Could not get avatar URL after upload.", variant: "destructive" });
                          setIsUploadingAvatar(false);
                           setAvatarUploadProgress(null); // Reset progress on error getting URL
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
           // 1. Upload new avatar if selected
           if (avatarFile) {
               finalAvatarUrl = await uploadAvatar(); // This updates avatarUrl state on success
           }

           // 2. Prepare data to update in Firestore
           const userDocRef = doc(db!, 'users', user.uid);
           const updatedProfileData: Partial<Omit<UserProfile, 'uid' | 'email' | 'joinDate'>> = {
               name: name,
               avatarUrl: finalAvatarUrl, // Use the potentially updated URL
               schoolBoard: schoolBoard,
               grade: grade,
           };

           // 3. Update Firestore document
           await updateDoc(userDocRef, updatedProfileData);

            // 4. Update Firebase Auth profile (name and photoURL)
           await updateAuthProfile(user, {
               displayName: name,
               photoURL: finalAvatarUrl,
           });


           // 5. Handle password change if a new password is entered
           if (password) {
               if (!currentPassword) {
                   toast({
                       title: "Password Update Skipped",
                       description: "Enter your current password to change it.",
                       variant: "default", // Use default, not destructive
                   });
                   // Don't stop the rest of the profile update for this
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
                       if (passwordError.code === 'auth/wrong-password') {
                           toast({
                               title: "Re-authentication Failed",
                               description: "Incorrect current password. Password not updated.",
                               variant: "destructive",
                           });
                       } else if (passwordError.code === 'auth/requires-recent-login') {
                            toast({
                                title: "Re-authentication Required",
                                description: "Please log out and log back in to update your password.",
                                variant: "destructive",
                            });
                       } else {
                            toast({
                               title: "Password Update Failed",
                               description: passwordError.message || "Could not update password.",
                               variant: "destructive",
                            });
                       }
                       // Do not stop profile update if only password fails
                   }
               }
           }

           // 6. Update local state optimistically or re-fetch (already partially done by uploadAvatar)
            setProfile(prev => prev ? { ...prev, ...updatedProfileData } : null);
            setAvatarFile(null); // Clear selected file after successful update
            setAvatarUploadProgress(null); // Clear progress

           toast({
               title: "Profile Updated",
               description: "Your profile information has been saved.",
           });
      } catch (error: any) {
           console.error('Error updating profile:', error);
            // Handle errors from Firestore update or general upload errors (already handled in uploadAvatar)
            if (!error.code?.startsWith('storage/')) { // Avoid double-toasting storage errors
                toast({
                  title: "Update Failed",
                  description: error.message || "Could not update profile. Please try again.",
                  variant: "destructive",
                });
            }
      } finally {
          setIsUpdating(false);
          setIsUploadingAvatar(false); // Ensure this is reset even if upload promise was rejected earlier
      }
  };


  if (isLoading || authLoading || isLoadingBoards) {
      return (
          <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
      );
  }

   if (!user || !profile) {
       // This should ideally not be reached if layout redirects properly
       return <p className="text-center text-muted-foreground">Please log in to view your profile.</p>;
   }


  const getInitials = (nameString: string) => {
    if (!nameString) return '??';
    const names = nameString.split(' ');
    const initials = names.map(n => n[0]).join('');
    return initials.slice(0, 2).toUpperCase();
  }

   const formatJoinDate = (dateString?: string | Date) => {
       if (!dateString) {
           // Fallback using auth metadata if Firestore data is missing/invalid
           return user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Not specified';
       }
       try {
           // Handle both Date objects and ISO strings
           const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
           // Check if the date is valid before formatting
            if (isNaN(date.getTime())) {
                return 'Invalid Date';
            }
           return date.toLocaleDateString();
       } catch {
           return 'Invalid Date';
       }
   }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>
      <p className="text-muted-foreground mb-8">
        View and update your personal information and account details.
      </p>

      <Card className="max-w-2xl mx-auto">
        <CardHeader className="flex flex-col items-center text-center">
           <div className="relative group">
             <Avatar className="h-24 w-24 mb-4">
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
          {/* Removed the text input for avatar URL, handled by upload now */}

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
                       {/* Add a default/none option */}
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
                       {/* Add a default/none option */}
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
            </div>


          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Member since: {formatJoinDate(profile.joinDate)}
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
