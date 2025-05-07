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
import { Loader2, AlertTriangle, Moon, Sun, Bell, Volume2 } from 'lucide-react'; // Added icons
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert components
import { cn } from '@/lib/utils'; // Import cn

type SettingsPreferences = NonNullable<UserProfile['preferences']>;

// Define default preferences
const defaultPreferences: SettingsPreferences = {
    darkMode: false, // Default to light mode initially
    emailNotifications: true,
    pushNotifications: false,
    voiceCommands: false,
};

export default function SettingsPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  // State for settings - Initialize with defaults
   const [preferences, setPreferences] = useState<SettingsPreferences>(defaultPreferences);
   const [isLoading, setIsLoading] = useState(true); // Use this for page loading
   const [isSaving, setIsSaving] = useState(false);
   const [fetchError, setFetchError] = useState<string | null>(null);


  // Function to apply dark mode based on state
  const applyDarkMode = (isDark: boolean) => {
      if (typeof document !== 'undefined') {
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
      }
  }

  // Effect to apply system preference initially if no user preference is loaded yet
   useEffect(() => {
       // Only run this initial check if loading is true (before user data is fetched)
       if (isLoading && typeof window !== 'undefined') {
            const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
             console.log("Initial system dark mode preference:", systemPrefersDark);
            // Apply system preference visually, state will be updated later if user has saved pref
            applyDarkMode(systemPrefersDark);
            // Update state only if we are still using the default (which matches system)
             // Check if the current state is still the default before overriding with system preference
            if (JSON.stringify(preferences) === JSON.stringify(defaultPreferences)) {
                 setPreferences(prev => ({ ...prev, darkMode: systemPrefersDark }));
            }
       }
   }, [isLoading]); // Run only when isLoading changes


  // Fetch user profile data (including preferences) on mount or when user changes
  useEffect(() => {
      // Wait for auth state to be resolved
      if (authLoading) {
           setIsLoading(true); // Keep loading true while auth is resolving
           return;
      }
      // Only fetch if user is loaded and exists
      if (user) {
          const fetchPreferences = async () => {
            setIsLoading(true); // Set loading true before fetch starts
            setFetchError(null); // Reset error
            try {
                ensureFirebaseInitialized();
                const userDocRef = doc(db!, 'users', user.uid);
                const docSnap = await getDoc(userDocRef);

                let loadedPreferences = defaultPreferences;

                if (docSnap.exists()) {
                    const profile = docSnap.data() as UserProfile;
                    // Merge fetched preferences with defaults to ensure all keys exist
                    loadedPreferences = { ...defaultPreferences, ...(profile.preferences || {}) };
                    console.log("Fetched user preferences:", loadedPreferences);
                } else {
                     // User profile doc doesn't exist, maybe create it or just use defaults?
                     // For settings, it's safer to just use defaults if profile doesn't exist yet.
                     console.log("User profile not found for settings, using default preferences.");
                     // Keep loadedPreferences as defaultPreferences
                     // Optionally create the profile document with default preferences here if needed:
                     // await setDoc(userDocRef, { preferences: defaultPreferences }, { merge: true });
                }
                setPreferences(loadedPreferences);
                // Apply the loaded (or default) dark mode setting
                applyDarkMode(loadedPreferences.darkMode);

            } catch (error: any) {
              console.error("Failed to fetch user preferences:", error);
               let errorDesc = "Could not load settings.";
               if (error.code === 'permission-denied') {
                    errorDesc = "Permission denied fetching settings. Check Firestore rules.";
                     console.error("Firestore permission denied. Check your security rules in firestore.rules and ensure they are deployed.");
               } else if (error.code === 'unavailable') {
                     errorDesc = "Network error fetching settings. Using defaults.";
               }
              setFetchError(errorDesc);
              toast({
                  title: "Error Loading Settings",
                  description: errorDesc,
                  variant: "destructive",
              });
              // Fallback to defaults on error
              setPreferences(defaultPreferences);
              applyDarkMode(defaultPreferences.darkMode); // Apply default dark mode on error
            } finally {
              setIsLoading(false); // Stop loading after fetch attempt
            }
          };
          fetchPreferences();
      } else {
           // If auth is done loading and there's no user
           setIsLoading(false); // Stop loading if no user
           setFetchError("Please log in to manage your settings.");
           // Use system preference for dark mode if not logged in
            if (typeof window !== 'undefined') {
                const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                applyDarkMode(systemPrefersDark);
                setPreferences(prev => ({...prev, darkMode: systemPrefersDark})); // Update state visually
            }
      }
  }, [user, authLoading, toast]); // Rerun if user changes


  const handleSettingChange = (settingKey: keyof SettingsPreferences, value: boolean) => {
      setPreferences(prev => ({ ...prev, [settingKey]: value }));
      // Handle dark mode specifically for immediate UI update
      if (settingKey === 'darkMode') {
          applyDarkMode(value);
      }
  };

  const handleSaveChanges = async () => {
      if (!user) {
          toast({ title: "Authentication Required", description: "You must be logged in to save settings.", variant: "destructive" });
          return;
      }
      setIsSaving(true);
      try {
            ensureFirebaseInitialized();
            const userDocRef = doc(db!, 'users', user.uid);
            // Use setDoc with merge:true which handles both creation and update safely.
            await setDoc(userDocRef, { preferences: preferences }, { merge: true });
            toast({ title: "Settings Saved", description: "Your preferences have been updated." });
      } catch (error: any) {
          console.error("Error saving settings:", error);
          let errorDesc = "Could not save settings.";
         if (error.code === 'permission-denied') {
             errorDesc = "Permission denied saving settings. Check Firestore rules.";
              console.error("Firestore permission denied. Check your security rules in firestore.rules and ensure they are deployed.");
         } else if (error.code === 'unavailable') {
              errorDesc = "Network error saving settings. Changes might not be saved.";
         }
          toast({ title: "Save Failed", description: errorDesc, variant: "destructive" });
      } finally {
          setIsSaving(false);
      }
  };


  // Consolidated Loading State
  if (authLoading || isLoading) {
     return (
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading settings...</p>
        </div>
     );
  }

   // Handle fetch error state more prominently
   if (fetchError && !user) { // Show error primarily if user isn't logged in
       return (
          <div className="container mx-auto py-8 text-center">
              <h1 className="text-3xl font-bold mb-6">Settings</h1>
             <Alert variant="destructive" className="max-w-md mx-auto shadow">
               <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
               <AlertDescription>{fetchError}</AlertDescription>
             </Alert>
          </div>
       );
   }
    // Handle no user after loading, but no specific fetch error
    if (!user) {
         return (
            <div className="container mx-auto py-8 text-center">
                <h1 className="text-3xl font-bold mb-6">Settings</h1>
                 <Alert variant="destructive" className="max-w-md mx-auto shadow">
                     <AlertTriangle className="h-4 w-4" />
                     <AlertTitle>Authentication Required</AlertTitle>
                     <AlertDescription>Please log in to manage your settings.</AlertDescription>
                 </Alert>
            </div>
         );
    }


  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2">Settings</h1>
      <p className="text-muted-foreground mb-8 max-w-2xl">
        Manage your account preferences and application settings.
        {fetchError && <span className="ml-2 text-xs text-destructive">({fetchError})</span>}
      </p>

      <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
          {/* Appearance Card */}
          <Card className="shadow-lg rounded-lg overflow-hidden">
              <CardHeader className="bg-muted/30">
                  <CardTitle className="text-xl flex items-center gap-2"><Sun className="h-5 w-5 text-primary inline dark:hidden"/><Moon className="h-5 w-5 text-primary hidden dark:inline"/> Appearance</CardTitle>
                  <CardDescription>Customize the look and feel of the app.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                   <div className="flex items-center justify-between p-4 rounded-md border hover:bg-muted/50 transition-colors">
                       <Label htmlFor="dark-mode" className="flex flex-col space-y-1 cursor-pointer flex-1 pr-4">
                           <span>Dark Mode</span>
                           <span className="font-normal leading-snug text-muted-foreground text-xs">
                                Switch between light and dark themes.
                           </span>
                        </Label>
                       <Switch
                          id="dark-mode"
                          checked={preferences.darkMode}
                          onCheckedChange={(checked) => handleSettingChange('darkMode', checked)}
                          disabled={isSaving || !user} // Also disable if not logged in
                          aria-label="Toggle dark mode"
                        />
                   </div>
                   {/* Placeholder for more appearance settings */}
                   {/* <div className="flex items-center justify-between p-4 rounded-md border opacity-50 cursor-not-allowed"> ... </div> */}
              </CardContent>
          </Card>

          {/* Notifications Card */}
           <Card className="shadow-lg rounded-lg overflow-hidden">
              <CardHeader className="bg-muted/30">
                  <CardTitle className="text-xl flex items-center gap-2"><Bell className="h-5 w-5 text-primary"/> Notifications</CardTitle>
                  <CardDescription>Control how you receive notifications.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                   <div className="flex items-center justify-between p-4 rounded-md border hover:bg-muted/50 transition-colors">
                        <Label htmlFor="email-notifications" className="flex flex-col space-y-1 cursor-pointer flex-1 pr-4">
                           <span>Email Notifications</span>
                           <span className="font-normal leading-snug text-muted-foreground text-xs">
                                Receive important updates via email.
                           </span>
                        </Label>
                       <Switch
                          id="email-notifications"
                          checked={preferences.emailNotifications}
                          onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
                          disabled={isSaving || !user}
                          aria-label="Toggle email notifications"
                        />
                   </div>
                   <div className="flex items-center justify-between p-4 rounded-md border hover:bg-muted/50 transition-colors">
                        <Label htmlFor="push-notifications" className="flex flex-col space-y-1 cursor-pointer flex-1 pr-4">
                           <span>Push Notifications</span>
                           <span className="font-normal leading-snug text-muted-foreground text-xs">
                                Get real-time alerts on your device (coming soon).
                           </span>
                        </Label>
                       <Switch
                           id="push-notifications"
                           checked={preferences.pushNotifications}
                           onCheckedChange={(checked) => handleSettingChange('pushNotifications', checked)}
                           disabled={true} // Feature not implemented yet
                           aria-label="Toggle push notifications (disabled)"
                        />
                   </div>
                    {/* Placeholder for more notification settings */}
              </CardContent>
          </Card>

          {/* Accessibility & Beta Card */}
           <Card className="shadow-lg rounded-lg overflow-hidden md:col-span-2">
              <CardHeader className="bg-muted/30">
                  <CardTitle className="text-xl flex items-center gap-2"><Volume2 className="h-5 w-5 text-primary"/> Accessibility & Beta Features</CardTitle>
                  <CardDescription>Configure accessibility options and try experimental features.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                   <div className="flex items-center justify-between p-4 rounded-md border hover:bg-muted/50 transition-colors">
                        <Label htmlFor="voice-commands" className="flex flex-col space-y-1 cursor-pointer flex-1 pr-4">
                           <span>Voice Commands</span>
                           <span className="font-normal leading-snug text-muted-foreground text-xs">
                                Enable voice interactions (experimental, coming soon).
                           </span>
                        </Label>
                       <Switch
                          id="voice-commands"
                          checked={preferences.voiceCommands}
                          onCheckedChange={(checked) => handleSettingChange('voiceCommands', checked)}
                          disabled={true} // Feature not implemented yet
                          aria-label="Toggle voice commands (disabled)"
                       />
                   </div>
                   {/* Placeholder for font size, contrast etc. */}
                   {/* <div className="flex items-center justify-between p-4 rounded-md border opacity-50 cursor-not-allowed"> ... </div> */}
              </CardContent>
          </Card>
      </div>

       {/* Save Button - Centered */}
       <div className="mt-8 flex justify-center">
           <Button onClick={handleSaveChanges} disabled={isSaving || !user}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSaving ? 'Saving...' : 'Save All Settings'}
           </Button>
       </div>
    </div>
  );
}
