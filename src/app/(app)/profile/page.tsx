'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
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
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setProfile(data);
            setName(data.name || user.displayName || '');
            setAvatarUrl(data.avatarUrl || user.photoURL || `https://avatar.vercel.sh/${user.email}.png`); // Fallback avatar
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
                  setAvatarUrl(defaultProfile.avatarUrl);
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

   const handleUpdateProfile = async () => {
      if (!user || !profile) return;

      setIsUpdating(true);
      const userDocRef = doc(db, 'users', user.uid);

      try {
          // Prepare data to update in Firestore
          // Use Partial<UserProfile> to only update changed fields
          const updatedProfileData: Partial<Omit<UserProfile, 'uid' | 'email' | 'joinDate'>> = {
              name: name,
              avatarUrl: avatarUrl,
              schoolBoard: schoolBoard,
              grade: grade,
          };


          // Update Firestore document
          await updateDoc(userDocRef, updatedProfileData);

          // Handle password change if a new password is entered
          if (password) {
              if (!currentPassword) {
                  toast({
                      title: "Password Update Failed",
                      description: "Please enter your current password to change it.",
                      variant: "destructive",
                  });
                  setIsUpdating(false);
                  return;
              }

              // Re-authenticate user before password update (required for security)
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
          }

          // Update local state optimistically or re-fetch
           setProfile(prev => prev ? { ...prev, ...updatedProfileData } : null);

          toast({
              title: "Profile Updated",
              description: "Your profile information has been saved.",
          });
      } catch (error: any) {
          console.error('Error updating profile:', error);
           if (error.code === 'auth/wrong-password') {
                toast({
                    title: "Re-authentication Failed",
                    description: "Incorrect current password. Please try again.",
                    variant: "destructive",
                });
            } else if (error.code === 'auth/requires-recent-login') {
                 toast({
                     title: "Re-authentication Required",
                     description: "Please log out and log back in to update your password.",
                     variant: "destructive",
                 });
            }
            else {
                toast({
                  title: "Update Failed",
                  description: error.message || "Could not update profile. Please try again.",
                  variant: "destructive",
                });
            }
      } finally {
          setIsUpdating(false);
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
           return new Date(dateString).toLocaleDateString();
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
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage key={avatarUrl} src={avatarUrl} alt={name} data-ai-hint="user avatar placeholder" />
            <AvatarFallback>{getInitials(name)}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl">{name}</CardTitle>
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
          <div className="space-y-2">
            <Label htmlFor="avatar">Profile Picture URL</Label>
            <Input id="avatar" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} disabled={isUpdating} placeholder="https://example.com/avatar.png"/>
             <p className="text-xs text-muted-foreground">Enter the URL of your desired profile image.</p>
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
          <Button onClick={handleUpdateProfile} disabled={isUpdating}>
            {isUpdating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : 'Update Profile'}
          </Button>
        </CardFooter>
      </Card>

    </div>
  );
}
