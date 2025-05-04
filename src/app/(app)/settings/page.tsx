
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getSchoolBoards, type SchoolBoard } from '@/services/school-board';

export default function SettingsPage() {
  const { toast } = useToast();

  // State for settings
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<string | undefined>(undefined);
  const [selectedGrade, setSelectedGrade] = useState<string | undefined>(undefined);
  const [voiceCommands, setVoiceCommands] = useState(false);
  const [schoolBoards, setSchoolBoards] = useState<SchoolBoard[]>([]);
  const [isLoadingBoards, setIsLoadingBoards] = useState(true);


  // Fetch school boards on mount
  useEffect(() => {
    const fetchBoards = async () => {
      setIsLoadingBoards(true);
      try {
        const boards = await getSchoolBoards();
        setSchoolBoards(boards);
         // Simulate loading user preferences - replace with actual fetch
         await new Promise(resolve => setTimeout(resolve, 500));
         // Set default/loaded values (example)
         setSelectedBoard('cbse');
         setSelectedGrade('10');
         // Check system/saved theme preference
         if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
             setDarkMode(true);
             document.documentElement.classList.add('dark');
         }

      } catch (error) {
        console.error("Failed to fetch school boards:", error);
        toast({ title: "Error", description: "Could not load school boards.", variant: "destructive" });
      } finally {
        setIsLoadingBoards(false);
      }
    };
    fetchBoards();
  }, [toast]);


  // Handlers for settings changes
  const handleSettingChange = (settingName: string, value: any) => {
    // In a real app, you would save this preference to user settings (e.g., database or localStorage)
    console.log(`Setting ${settingName} changed to:`, value);
    toast({
      title: "Settings Updated",
      description: `${settingName} preference saved (simulation).`,
    });

    // Handle dark mode specifically
    if (settingName === 'Dark Mode') {
       setDarkMode(value);
       if (value) {
          document.documentElement.classList.add('dark');
       } else {
           document.documentElement.classList.remove('dark');
       }
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <p className="text-muted-foreground mb-8">
        Manage your account preferences and application settings.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
          <Card>
              <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>Customize the look and feel of the app.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                   <div className="flex items-center justify-between">
                       <Label htmlFor="dark-mode">Dark Mode</Label>
                       <Switch
                          id="dark-mode"
                          checked={darkMode}
                          onCheckedChange={(checked) => handleSettingChange('Dark Mode', checked)}
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
                       <Label htmlFor="email-notifications">Email Notifications</Label>
                       <Switch
                          id="email-notifications"
                          checked={emailNotifications}
                          onCheckedChange={(checked) => {
                            setEmailNotifications(checked);
                            handleSettingChange('Email Notifications', checked);
                          }}
                        />
                   </div>
                   <div className="flex items-center justify-between">
                       <Label htmlFor="push-notifications">Push Notifications</Label>
                       <Switch
                           id="push-notifications"
                           checked={pushNotifications}
                           onCheckedChange={(checked) => {
                               setPushNotifications(checked);
                               handleSettingChange('Push Notifications', checked)
                           }}
                        />
                   </div>
                    {/* Add more notification settings here */}
              </CardContent>
          </Card>

          <Card>
              <CardHeader>
                  <CardTitle>Learning Preferences</CardTitle>
                  <CardDescription>Set your preferred school board and grade.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                   <div>
                       <Label htmlFor="school-board">School Board</Label>
                       <Select
                         value={selectedBoard}
                         onValueChange={(value) => {
                             setSelectedBoard(value);
                             handleSettingChange('School Board', value);
                         }}
                         disabled={isLoadingBoards}
                       >
                           <SelectTrigger id="school-board">
                               <SelectValue placeholder={isLoadingBoards ? "Loading boards..." : "Select board..."} />
                           </SelectTrigger>
                           <SelectContent>
                                {schoolBoards.map(board => (
                                    <SelectItem key={board.id} value={board.id}>{board.name}</SelectItem>
                                ))}
                                <SelectItem value="state">State Board</SelectItem> {/* Example fallback */}
                           </SelectContent>
                       </Select>
                   </div>
                    <div>
                       <Label htmlFor="grade-level">Grade Level</Label>
                       <Select
                           value={selectedGrade}
                           onValueChange={(value) => {
                               setSelectedGrade(value);
                               handleSettingChange('Grade Level', value);
                            }}
                       >
                           <SelectTrigger id="grade-level">
                               <SelectValue placeholder="Select grade..." />
                           </SelectTrigger>
                           <SelectContent>
                               {[...Array(12)].map((_, i) => (
                                   <SelectItem key={i + 1} value={`${i + 1}`}>Grade {i + 1}</SelectItem>
                               ))}
                           </SelectContent>
                       </Select>
                   </div>
              </CardContent>
          </Card>

           <Card>
              <CardHeader>
                  <CardTitle>Accessibility</CardTitle>
                  <CardDescription>Configure accessibility options.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                   <div className="flex items-center justify-between">
                       <Label htmlFor="voice-commands">Enable Voice Commands</Label>
                       <Switch
                          id="voice-commands"
                          checked={voiceCommands}
                          onCheckedChange={(checked) => {
                              setVoiceCommands(checked);
                              handleSettingChange('Voice Commands', checked);
                          }}
                       />
                   </div>
                   {/* Add font size, contrast settings etc. */}
              </CardContent>
          </Card>
      </div>
    </div>
  );
}
