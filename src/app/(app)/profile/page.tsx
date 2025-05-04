
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { toast } = useToast();
  // Placeholder data
  const initialUser = {
      name: "Alex Johnson",
      email: "alex.j@example.com",
      avatarUrl: "https://picsum.photos/100/100?random=1", // Placeholder image
      initials: "AJ",
      schoolBoard: "CBSE",
      grade: "10",
      joinDate: "January 15, 2024",
  }

  const [name, setName] = useState(initialUser.name);
  const [avatarUrl, setAvatarUrl] = useState(initialUser.avatarUrl);
  const [password, setPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);


  const handleUpdateProfile = async () => {
      setIsUpdating(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // In a real app, you would send the updated data (name, avatarUrl, password if changed) to your backend API.
      console.log('Updating profile with:', { name, avatarUrl, password: password ? '******' : '(not changed)' });

      setIsUpdating(false);
      setPassword(''); // Clear password field after attempt

      toast({
          title: "Profile Updated",
          description: "Your profile information has been successfully updated (simulation).",
      });
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>
      <p className="text-muted-foreground mb-8">
        View and update your personal information and account details.
      </p>

      <Card className="max-w-2xl mx-auto">
        <CardHeader className="flex flex-col items-center text-center">
          <Avatar className="h-24 w-24 mb-4">
             {/* Use a key to force re-render if avatarUrl changes */}
             <AvatarImage key={avatarUrl} src={avatarUrl} alt={name} data-ai-hint="user avatar" />
            <AvatarFallback>{initialUser.initials}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl">{name}</CardTitle>
          <CardDescription>{initialUser.email}</CardDescription>
           <div className="flex gap-2 mt-2">
              <Badge variant="secondary">{initialUser.schoolBoard}</Badge>
              <Badge variant="outline">Grade {initialUser.grade}</Badge>
           </div>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="space-y-2">
             <Label htmlFor="name">Full Name</Label>
             <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isUpdating}/>
           </div>
            <div className="space-y-2">
             <Label htmlFor="email">Email Address</Label>
             <Input id="email" type="email" defaultValue={initialUser.email} readOnly disabled />
              <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
           </div>
           <div className="space-y-2">
              <Label htmlFor="avatar">Profile Picture URL</Label>
              <Input id="avatar" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} disabled={isUpdating} />
           </div>
            <div className="space-y-2">
             <Label htmlFor="password">Change Password</Label>
             <Input
                id="password"
                type="password"
                placeholder="Enter new password (optional)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isUpdating}
              />
           </div>

           <div className="border-t pt-4">
               <p className="text-sm text-muted-foreground">Member since: {initialUser.joinDate}</p>
           </div>

        </CardContent>
        <CardFooter className="flex justify-end">
            <Button onClick={handleUpdateProfile} disabled={isUpdating}>
                {isUpdating ? 'Updating...' : 'Update Profile'}
             </Button>
        </CardFooter>
      </Card>

    </div>
  );
}
