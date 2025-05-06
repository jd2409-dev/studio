
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { db, ensureFirebaseInitialized } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '@/types/user';
import { Loader2 } from 'lucide-react';

type SettingsPreferences = NonNullable<UserProfile['preferences']>;

export default function SettingsPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  // State for settings - Initialize with defaults
   const [preferences, setPreferences] = useState<SettingsPreferences>({
      darkMode: false,
      emailNotifications: true,
      pushNotifications: false,
      voiceCommands: false,
   });
   const [isLoading, setIsLoading] = useState(true);
   const [isSaving, setIsSaving] = useState(false);


  // Fetch user profile data (including preferences) on mount
  useEffect(() => {
    if (user) {
      const fetchPreferences = async () => {
        setIsLoading(true);
        ensureFirebaseInitialized();
        const userDocRef = doc(db!, 'users', user.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const profile = docSnap.data() as UserProfile;
             // Merge fetched preferences with defaults
             setPreferences(prev => ({ ...prev, ...profile.preferences }));
             // Apply dark mode immediately if loaded
             if (profile.preferences?.darkMode) {
                document.documentElement.classList.add('dark');
             } else {
                 // Check system preference if no saved preference
                 const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                 if(systemPrefersDark) {
                    document.documentElement.classList.add('dark');
                    // Update state to reflect system pref if no user pref
                     setPreferences(prev => ({ ...prev, darkMode: true }));
                 } else {
                    document.documentElement.classList.remove('dark');
                 }
             }
          } else {
             // User profile doc doesn't exist, use defaults
             console.log("User profile not found, using default settings.");
              // Apply system dark mode preference initially
              const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
              if(systemPrefersDark) {
                 document.documentElement.classList.add('dark');
                  setPreferences(prev => ({ ...prev, darkMode: true }));
              }
          }
        } catch (error) {
          console.error("Failed to fetch user preferences:", error);
          toast({ title: "Error", description: "Could not load settings.", variant: "destructive" });
           // Apply system dark mode preference on error too
           const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
             if(systemPrefersDark) {
                document.documentElement.classList.add('dark');
                 setPreferences(prev => ({ ...prev, darkMode: true }));
             }
        } finally {
          setIsLoading(false);
        }
      };
      fetchPreferences();
    } else if (!authLoading) {
         setIsLoading(false); // Stop loading if user is null
         // Apply system dark mode preference if not logged in
         const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
          if(systemPrefersDark) {
             document.documentElement.classList.add('dark');
             // No need to set state as it won't be saved
          }
    }
  }, [user, authLoading, toast]);


  const handleSettingChange = (settingKey: keyof SettingsPreferences, value: boolean) => {
      setPreferences(prev => ({ ...prev, [settingKey]: value }));

      // Handle dark mode specifically for immediate UI update
      if (settingKey === 'darkMode') {
          if (value) {
              document.documentElement.classList.add('dark');
          } else {
              document.documentElement.classList.remove('dark');
          }
      }
  };

  const handleSaveChanges = async () => {
      if (!user) {
          toast({ title: "Error", description: "You must be logged in to save settings.", variant: "destructive" });
          return;
      }
      setIsSaving(true);
      ensureFirebaseInitialized();
      const userDocRef = doc(db!, 'users', user.uid);
      try {
         // Use setDoc with merge: true to create or update the preferences field
         await setDoc(userDocRef, { preferences }, { merge: true });
         toast({ title: "Settings Saved", description: "Your preferences have been updated." });
      } catch (error: any) {
          console.error("Error saving settings:", error);
          let errorDesc = "Could not save settings.";
         if (error.code === 'permission-denied') {
             errorDesc = "Permission denied. Check Firestore rules.";
         }
          toast({ title: "Save Failed", description: errorDesc, variant: "destructive" });
      } finally {
          setIsSaving(false);
      }
  };


  if (authLoading || isLoading) {
     return (
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
     );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <p className="text-muted-foreground mb-8">
        Manage your account preferences and application settings.
      </p>

      <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          <Card>
              <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>Customize the look and feel of the app.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                   <div className="flex items-center justify-between">
                       <Label htmlFor="dark-mode" className="flex flex-col space-y-1">
                           <span>Dark Mode</span>
                           <span className="font-normal leading-snug text-muted-foreground">
                                Adjust the application theme.
                           </span>
                        </Label>
                       <Switch
                          id="dark-mode"
                          checked={preferences.darkMode}
                          onCheckedChange={(checked) => handleSettingChange('darkMode', checked)}
                          disabled={isSaving}
                        />
                   </div>
                   {/* Add more appearance settings here */}
              </CardContent>
          </Card>

           <Card>
              <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>Control how you receive notifications.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                   <div className="flex items-center justify-between">
                        <Label htmlFor="email-notifications" className="flex flex-col space-y-1">
                           <span>Email Notifications</span>
                           <span className="font-normal leading-snug text-muted-foreground">
                                Receive important updates via email.
                           </span>
                        </Label>
                       <Switch
                          id="email-notifications"
                          checked={preferences.emailNotifications}
                          onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
                          disabled={isSaving}
                        />
                   </div>
                   <div className="flex items-center justify-between">
                        <Label htmlFor="push-notifications" className="flex flex-col space-y-1">
                           <span>Push Notifications</span>
                           <span className="font-normal leading-snug text-muted-foreground">
                                Get real-time alerts on your device (requires setup).
                           </span>
                        </Label>
                       <Switch
                           id="push-notifications"
                           checked={preferences.pushNotifications}
                           onCheckedChange={(checked) => handleSettingChange('pushNotifications', checked)}
                           disabled={isSaving}
                        />
                   </div>
                    {/* Add more notification settings here */}
              </CardContent>
          </Card>

           <Card className="md:col-span-2">
              <CardHeader>
                  <CardTitle>Accessibility</CardTitle>
                  <CardDescription>Configure accessibility options.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                   <div className="flex items-center justify-between">
                        <Label htmlFor="voice-commands" className="flex flex-col space-y-1">
                           <span>Voice Commands</span>
                           <span className="font-normal leading-snug text-muted-foreground">
                                Enable voice interactions (experimental).
                           </span>
                        </Label>
                       <Switch
                          id="voice-commands"
                          checked={preferences.voiceCommands}
                          onCheckedChange={(checked) => handleSettingChange('voiceCommands', checked)}
                          disabled={isSaving}
                       />
                   </div>
                   {/* Add font size, contrast settings etc. */}
              </CardContent>
          </Card>
      </div>

       <div className="mt-8 flex justify-center">
           <Button onClick={handleSaveChanges} disabled={isSaving || !user}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSaving ? 'Saving...' : 'Save Preferences'}
           </Button>
       </div>
    </div>
  );
}
